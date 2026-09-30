import { FileText, CreditCard, Plane, Briefcase, Receipt, Image, DollarSign, Package, Shield, Bell, TrendingUp, Target } from 'lucide-react';

export default function FormIndex({ onSelectForm }) {
  const forms = [
    {
      id: 'supervision-diaria',
      title: 'Supervisión Diaria',
      description: 'Control diario de ventas, cobros y metas por equipo',
      icon: Target,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      id: 'ventas',
      title: 'Gestión de Ventas',
      description: 'Control de ventas diarias, metas y productividad',
      icon: TrendingUp,
      color: 'bg-emerald-500 hover:bg-emerald-600'
    },
    {
      id: 'apertura',
      title: 'Apertura de Código',
      description: 'Formulario para apertura de código de cliente',
      icon: FileText,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'credito',
      title: 'Solicitud de Crédito',
      description: 'Solicitud de crédito para personas individuales y jurídicas',
      icon: CreditCard,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'viaticos',
      title: 'Solicitud de Viáticos',
      description: 'Formulario de solicitud de viáticos para giras',
      icon: Plane,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'liquidacion-viaticos',
      title: 'Liquidación de Viáticos',
      description: 'Liquidación de gastos de viáticos por ruta/gira',
      icon: DollarSign,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      id: 'empleo',
      title: 'Solicitud de Empleo',
      description: 'Formulario de solicitud de empleo',
      icon: Briefcase,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      id: 'liquidacion',
      title: 'Liquidación de Recibos',
      description: 'Formulario de liquidación de recibos',
      icon: Receipt,
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      id: 'plantilla',
      title: 'Plantilla Boletas',
      description: 'Plantilla para gestión de boletas con imágenes',
      icon: Image,
      color: 'bg-pink-500 hover:bg-pink-600'
    },
    {
      id: 'inventario',
      title: 'Inventario',
      description: 'Control de inventario con carga CSV y exportación XLSX',
      icon: Package,
      color: 'bg-teal-500 hover:bg-teal-600'
    },
    {
      id: 'supervision',
      title: 'Supervisión',
      description: 'Uso exclusivo Supervision',
      icon: Shield,
      color: 'bg-cyan-500 hover:bg-cyan-600'
    },
    {
      id: 'broadcast',
      title: 'Broadcast Recordatorios',
      description: 'Envío de mensajes masivos por WhatsApp',
      icon: Bell,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
            Sistema de Formularios
          </h1>
          <p className="text-xl text-gray-600">
            Droguería El Olam
          </p>
          <div className="mt-4 h-1 w-32 bg-blue-500 mx-auto rounded-full"></div>
        </div>

        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => {
            const Icon = form.icon;
            return (
              <button
                key={form.id}
                onClick={() => onSelectForm(form.id)}
                className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-6 text-left overflow-hidden"
              >
                {/* Background decoration */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${form.color} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-300`}></div>
                
                {/* Icon */}
                <div className={`${form.color} w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {form.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {form.description}
                </p>

                {/* Arrow indicator */}
                <div className="mt-4 flex items-center text-blue-500 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Abrir formulario
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Selecciona un formulario para comenzar</p>
        </div>
      </div>
    </div>
  );
}
