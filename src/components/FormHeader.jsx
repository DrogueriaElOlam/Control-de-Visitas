import Logo from './Logo';

export default function FormHeader({ logoSize = "medium" }) {
  return (
    <div className="mb-6">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '70%', verticalAlign: 'top', paddingRight: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                DISTRIBUIDORA COMERCIAL EL OLAM S.A.
              </h2>
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>
                7a. Avenida "A" 17-67 Colonia Aurora I Zona 13, Guatemala
              </p>
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>
                Teléfonos: 2308-4353, 2332-7814, 2339-4613
              </p>
            </td>
            <td style={{ width: '30%', verticalAlign: 'top', textAlign: 'right' }}>
              <Logo size={logoSize} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
