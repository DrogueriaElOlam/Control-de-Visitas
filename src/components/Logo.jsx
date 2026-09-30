export default function Logo({ size = "medium" }) {
  const sizeStyles = {
    small: { width: '80px', height: 'auto', maxHeight: '40px' },
    medium: { width: '100px', height: 'auto', maxHeight: '50px' },
    large: { width: '120px', height: 'auto', maxHeight: '60px' }
  };

  return (
    <div style={{ display: 'inline-block', textAlign: 'right' }}>
      <img 
        src="/logo.png" 
        alt="Droguería El Olam" 
        style={{
          ...sizeStyles[size],
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </div>
  );
}
