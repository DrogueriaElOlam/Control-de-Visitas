export default function Logo({ size = "medium", className = "" }) {
  const sizeStyles = {
    small: 'h-10 w-auto max-w-[100px]',
    medium: 'h-14 w-auto max-w-[140px]',
    large: 'h-20 w-auto max-w-[200px]'
  };

  return (
    <div className={`inline-flex items-center justify-end ${className}`}>
      <img 
        src="/logo.png" 
        alt="Droguería El Olam" 
        className={`${sizeStyles[size] || sizeStyles.medium} object-contain`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/logo.jpg';
        }}
      />
    </div>
  );
}
