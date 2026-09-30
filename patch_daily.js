const fs = require('fs');
const file = 'src/components/DailySupervisionForm.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { Save, History, Search, Target, Download, Calendar, Filter, Users, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';",
  "import { Save, History, Search, Target, Download, Calendar, Filter, Users, TrendingUp, TrendingDown, CheckCircle, Lock, LogOut } from 'lucide-react';"
);

const stateInsert = `
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('formAuth_0lam');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === '0l@m_2025$') {
      setIsAuthenticated(true);
      localStorage.setItem('formAuth_0lam', 'true');
      setError('');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('formAuth_0lam');
    setPasswordInput('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-blue-100">
          <CardHeader className="bg-blue-50 border-b border-blue-100 text-center rounded-t-xl">
            <div className="mx-auto bg-blue-600 w-12 h-12 flex items-center justify-center rounded-full mb-4 shadow-md">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-blue-900">Acceso Restringido</CardTitle>
            <CardDescription className="text-blue-700/70">
              Ingrese la contraseña para acceder a este formulario
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Contraseña"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full text-center text-lg"
                  autoFocus
                />
                {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all">
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }
`;

content = content.replace(
  "const [filterVendor, setFilterVendor] = useState('');",
  "const [filterVendor, setFilterVendor] = useState('');\n" + stateInsert
);

content = content.replace(
  `<Button onClick={handleSaveToHistory} className="bg-blue-600 hover:bg-blue-700">`,
  `<Button variant="outline" onClick={handleLogout} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
          <Button onClick={handleSaveToHistory} className="bg-blue-600 hover:bg-blue-700">`
);

fs.writeFileSync(file, content);
