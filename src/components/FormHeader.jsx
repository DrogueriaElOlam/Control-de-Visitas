import Logo from './Logo';

export default function FormHeader({ title, subtitle, logoSize = "medium" }) {
  return (
    <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:mb-4">
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-blue-900 leading-tight">
            DISTRIBUIDORA COMERCIAL EL OLAM S.A.
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
            Droguería El Olam • Calidad y Servicio Farmacéutico
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            7a. Avenida "A" 17-67 Colonia Aurora I Zona 13, Guatemala
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500">
            PBX: 2308-4353 • Teléfonos: 2332-7814, 2339-4613
          </p>
          {title && (
            <div className="mt-3 pt-2 border-t border-slate-200">
              <h3 className="text-sm sm:text-base font-black uppercase text-blue-800 tracking-wide">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center justify-center sm:justify-end">
          <Logo size={logoSize} />
        </div>
      </div>
    </div>
  );
}
