import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalDateString, getLocalStartOfMonthString } from '../lib/dateUtils';
import { Store, Plus, Edit2, Trash2, Eye, Link as LinkIcon, BarChart3, Upload, Save, X } from 'lucide-react';
import FormButtons from './FormButtons';

export default function TiendaEnLineaForm() {
  const [productos, setProductos] = useState([]);
  const [config, setConfig] = useState(null);
  const [visitas, setVisitas] = useState({ hoy: 0, mes: 0, año: 0 });
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: '',
    stock: '',
    imagen_url: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setLoading(true);
      
      // Cargar productos
      const { data: prods, error: errorProds } = await supabase
        .from('productos_tienda')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (errorProds) throw errorProds;
      setProductos(prods || []);

      // Cargar configuración
      const { data: conf, error: errorConf } = await supabase
        .from('config_tienda')
        .select('*')
        .single();

      if (errorConf && errorConf.code !== 'PGRST116') throw errorConf;
      setConfig(conf);

      // Cargar visitas
      await cargarVisitas();
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar los datos de la tienda');
    } finally {
      setLoading(false);
    }
  }

  async function cargarVisitas() {
    try {
      const hoy = getLocalDateString();
      const inicioMes = getLocalStartOfMonthString();
      const inicioAño = `${hoy.split('-')[0]}-01-01`;

      // Visitas de hoy
      const { data: visitasHoy } = await supabase
        .from('visitas_tienda')
        .select('contador')
        .eq('fecha', hoy)
        .single();

      // Visitas del mes
      const { data: visitasMes } = await supabase
        .from('visitas_tienda')
        .select('contador')
        .gte('fecha', inicioMes);

      // Visitas del año
      const { data: visitasAño } = await supabase
        .from('visitas_tienda')
        .select('contador')
        .gte('fecha', inicioAño);

      setVisitas({
        hoy: visitasHoy?.contador || 0,
        mes: visitasMes?.reduce((sum, v) => sum + v.contador, 0) || 0,
        año: visitasAño?.reduce((sum, v) => sum + v.contador, 0) || 0
      });
    } catch (error) {
      console.error('Error cargando visitas:', error);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleImageUpload(e, productoId = null) {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamaño (máximo 2MB para calidad media)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB');
      return;
    }

    try {
      // Convertir a base64 con calidad media
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Redimensionar manteniendo aspecto (máximo 800px)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a base64 con calidad 0.7
          const imageUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          if (productoId) {
            // Actualizar imagen de producto existente
            const { error } = await supabase
              .from('productos_tienda')
              .update({ imagen_url: imageUrl })
              .eq('id', productoId);
            
            if (error) throw error;
            await cargarDatos();
            alert('Imagen actualizada correctamente');
          } else {
            // Guardar en formulario nuevo
            setFormData(prev => ({ ...prev, imagen_url: imageUrl }));
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen');
    }
  }

  async function handleSaveProduct() {
    if (!formData.nombre || !formData.precio) {
      alert('El nombre y precio son obligatorios');
      return;
    }

    try {
      if (editingProduct) {
        // Actualizar producto existente
        const { error } = await supabase
          .from('productos_tienda')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio: parseFloat(formData.precio),
            categoria: formData.categoria,
            stock: parseInt(formData.stock) || 0,
            imagen_url: formData.imagen_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        alert('Producto actualizado correctamente');
      } else {
        // Crear nuevo producto
        const { error } = await supabase
          .from('productos_tienda')
          .insert({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio: parseFloat(formData.precio),
            categoria: formData.categoria,
            stock: parseInt(formData.stock) || 0,
            imagen_url: formData.imagen_url,
            orden: productos.length + 1
          });

        if (error) throw error;
        alert('Producto agregado correctamente');
      }

      // Resetear formulario
      setFormData({
        nombre: '',
        descripcion: '',
        precio: '',
        categoria: '',
        stock: '',
        imagen_url: ''
      });
      setEditingProduct(null);
      setShowAddProduct(false);
      await cargarDatos();
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error al guardar el producto');
    }
  }

  async function handleDeleteProduct(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('productos_tienda')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;
      await cargarDatos();
      alert('Producto eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando producto:', error);
      alert('Error al eliminar el producto');
    }
  }

  function handleEditProduct(producto) {
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio.toString(),
      categoria: producto.categoria || '',
      stock: producto.stock.toString(),
      imagen_url: producto.imagen_url || ''
    });
    setEditingProduct(producto);
    setShowAddProduct(true);
  }

  function handleCancelEdit() {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: '',
      stock: '',
      imagen_url: ''
    });
    setEditingProduct(null);
    setShowAddProduct(false);
  }

  function generarLinkTienda() {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/tienda-publica`;
    setLinkGenerado(link);
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(link);
    alert('Link copiado al portapapeles');
  }

  function handleExport() {
    const html = generarHTMLTienda();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tienda-online.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    if (confirm('¿Estás seguro de limpiar el formulario?')) {
      handleCancelEdit();
    }
  }

  function generarHTMLTienda() {
    const productosHTML = productos.map(p => `
      <div class="producto-card">
        ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}" class="producto-img">` : '<div class="producto-img-placeholder">Sin imagen</div>'}
        <div class="producto-info">
          <h3 class="producto-nombre">${p.nombre}</h3>
          ${p.descripcion ? `<p class="producto-descripcion">${p.descripcion}</p>` : ''}
          <p class="producto-precio">Q ${parseFloat(p.precio).toFixed(2)}</p>
          ${p.stock > 0 ? `<p class="producto-stock">Stock: ${p.stock}</p>` : '<p class="producto-sin-stock">Sin stock</p>'}
        </div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config?.nombre_tienda || 'Tienda en Línea'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #667eea;
    }
    
    .header h1 {
      font-size: 3em;
      color: #667eea;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    
    .header p {
      font-size: 1.2em;
      color: #666;
    }
    
    .productos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .producto-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .producto-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 15px 30px rgba(0,0,0,0.2);
    }
    
    .producto-img {
      width: 100%;
      height: 250px;
      object-fit: cover;
    }
    
    .producto-img-placeholder {
      width: 100%;
      height: 250px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.2em;
    }
    
    .producto-info {
      padding: 20px;
    }
    
    .producto-nombre {
      font-size: 1.4em;
      color: #333;
      margin-bottom: 10px;
    }
    
    .producto-descripcion {
      color: #666;
      font-size: 0.95em;
      margin-bottom: 15px;
      line-height: 1.5;
    }
    
    .producto-precio {
      font-size: 1.8em;
      color: #667eea;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .producto-stock {
      color: #10b981;
      font-weight: 600;
    }
    
    .producto-sin-stock {
      color: #ef4444;
      font-weight: 600;
    }
    
    .footer {
      text-align: center;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
      color: #666;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 20px;
      }
      
      .header h1 {
        font-size: 2em;
      }
      
      .productos-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }
    }
  </style>
  <script>
    // Incrementar contador de visitas al cargar la página
    window.addEventListener('load', async () => {
      try {
        const response = await fetch('${window.location.origin}/api/incrementar-visita', {
          method: 'POST'
        });
        console.log('Visita registrada');
      } catch (error) {
        console.error('Error registrando visita:', error);
      }
    });
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config?.nombre_tienda || 'Tienda en Línea'}</h1>
      <p>${config?.descripcion || 'Catálogo de productos'}</p>
    </div>
    
    <div class="productos-grid">
      ${productosHTML}
    </div>
    
    <div class="footer">
      <p>${config?.telefono ? `Tel: ${config.telefono}` : ''} ${config?.email ? `| Email: ${config.email}` : ''}</p>
      ${config?.direccion ? `<p>${config.direccion}</p>` : ''}
      <p style="margin-top: 20px; font-size: 0.9em;">© ${new Date().getFullYear()} ${config?.nombre_tienda || 'Tienda en Línea'}. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Tienda en Línea</h2>
        </div>
        
        {/* Estadísticas de visitas */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-1" />
            <p className="text-sm opacity-90">Hoy</p>
            <p className="text-2xl font-bold">{visitas.hoy}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-1" />
            <p className="text-sm opacity-90">Este Mes</p>
            <p className="text-2xl font-bold">{visitas.mes}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-1" />
            <p className="text-sm opacity-90">Este Año</p>
            <p className="text-2xl font-bold">{visitas.año}</p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowAddProduct(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Agregar Producto
        </button>
        
        <button
          onClick={generarLinkTienda}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <LinkIcon className="w-5 h-5" />
          Generar Link
        </button>
        
        <FormButtons onExport={handleExport} onClear={handleClear} />
      </div>

      {/* Link generado */}
      {linkGenerado && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 mb-2 font-semibold">Link de tu tienda (copiado al portapapeles):</p>
          <p className="text-blue-600 break-all">{linkGenerado}</p>
        </div>
      )}

      {/* Formulario agregar/editar producto */}
      {showAddProduct && (
        <div className="bg-white border-2 border-blue-500 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <button
              onClick={handleCancelEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Paracetamol 500mg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio *
              </label>
              <input
                type="number"
                name="precio"
                value={formData.precio}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <input
                type="text"
                name="categoria"
                value={formData.categoria}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Medicamentos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción del producto..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen del Producto
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.imagen_url && (
                  <img
                    src={formData.imagen_url}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                  />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Máximo 2MB, se optimizará automáticamente</p>
            </div>
          </div>

          <button
            onClick={handleSaveProduct}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <Save className="w-5 h-5" />
            {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
          </button>
        </div>
      )}

      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Productos ({productos.length})
        </h3>

        {productos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No hay productos en la tienda</p>
            <p className="text-sm">Agrega tu primer producto para comenzar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((producto) => (
              <div
                key={producto.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {producto.imagen_url ? (
                  <div className="relative">
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      className="w-full h-48 object-cover"
                    />
                    <label className="absolute top-2 right-2 bg-white rounded-full p-2 cursor-pointer hover:bg-gray-100 shadow-lg">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, producto.id)}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative w-full h-48 bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                    <label className="cursor-pointer text-white hover:bg-white/20 p-4 rounded-lg transition-colors">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Subir imagen</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, producto.id)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <div className="p-4">
                  <h4 className="font-bold text-lg text-gray-800 mb-1">
                    {producto.nombre}
                  </h4>
                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {producto.descripcion}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-blue-600 mb-2">
                    Q {parseFloat(producto.precio).toFixed(2)}
                  </p>
                  {producto.categoria && (
                    <p className="text-xs text-gray-500 mb-2">
                      {producto.categoria}
                    </p>
                  )}
                  <p className={`text-sm font-semibold mb-3 ${producto.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {producto.stock > 0 ? `Stock: ${producto.stock}` : 'Sin stock'}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditProduct(producto)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(producto.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
