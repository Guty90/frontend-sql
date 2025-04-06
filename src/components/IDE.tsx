import { useState, useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import axios from 'axios';

// Definición de la interfaz File
interface File {
  id: number;
  name: string;
  content: string;
  active: boolean;
}

// Componente principal del IDE
const IDE = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [indentSize, setIndentSize] = useState(2);
  const [dbConnection, setDbConnection] = useState({ connected: false, name: 'Sin conexión' });
  const [salida, setSalida] = useState<string | null>("No hay salida");
  const [sql, setSql] = useState<string | null>("No hay SQL");
  const [isError, setIsError] = useState(false);

  const addNewFile = () => {
    const newId = files.length > 0 ? Math.max(...files.map(f => f.id)) + 1 : 1;
    const newFileName = `query${newId}.gy`;
    
    const updatedFiles = files.map(file => ({
      ...file,
      active: false
    }));
    
    setFiles([
      ...updatedFiles,
      { 
        id: newId, 
        name: newFileName, 
        content: '', 
        active: true 
      }
    ]);
  };

  const updateFileContent = (id: number, newContent: string) => {
    setFiles(files.map(file => 
      file.id === id ? { ...file, content: newContent } : file
    ));
  };

  const activateFile = (id: number): void => {
    setFiles(files.map(file => ({
      ...file,
      active: file.id === id
    })));
  };

  const closeFile = (id: number, e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    
    const fileToRemove = files.find(f => f.id === id);
    if (fileToRemove && fileToRemove.active && files.length > 1) {
      const index = files.findIndex(f => f.id === id);
      const nextActiveIndex = index === 0 ? 1 : index - 1;
      const updatedFiles = files.filter(f => f.id !== id);
      updatedFiles[nextActiveIndex].active = true;
      setFiles(updatedFiles);
    } else {
      setFiles(files.filter(f => f.id !== id));
    }
  };

  const connectToDatabase = async () => {
    try{
      const res = await axios.post('http://localhost:8080/db/create', {
        sql:sql
      })
      setSalida(res.data.body);
      setIsError(false);
      setDbConnection({
        connected: true,
        name: res.data.dbName
      });
    }catch(ex){
      console.error('Error al conectar a la base de datos:', ex);
      setSalida((ex as Error).message);
      setIsError(true);
      setDbConnection({
        connected: false,
        name: 'Sin conexión'
      });
    }

    
  };

  const consultToDatabase = async () => {
    try{
      console.log("SQL mandado: " + sql)
      const res = await axios.post('http://localhost:8080/db/getTables', {
        sql:sql
      })
      const data = res.data
      const dataAsString = JSON.stringify(data, null, 2) // El 2 es para indentación
      setSalida(dataAsString)
      setIsError(false);
    }catch(ex){
      console.error('Error al consultar la base de datos:', ex);
      setSalida((ex as Error).message);
      setIsError(true);
    }

    
  };

  const disconnectFromDatabase = () => {
    setDbConnection({
      connected: false,
      name: 'Sin conexión'
    });
  };

  const createSQLCode = async () => {
    const activeFile = files.find(f => f.active);
    if (!activeFile) return;

    try {
      const res = await axios.post('http://localhost:8080/grammar/getGrammar', {
        instruction: activeFile.content
      });
      
      console.log('Data enviada:', activeFile.content);
      
      if (res.data.errors && res.data.errors.length > 0) {
        console.error('Errores en el código SQL:', res.data.errors);
        setSalida(res.data.errors);
        setIsError(true);
        setSql(null);
      } else {
        setSalida("Código SQL generado correctamente");
        setSql(res.data.sql);
        setIsError(false);
      }
      console.log('Código SQL generado:', res.data);
    } catch (ex) {
      console.error('Error al crear el código SQL:', ex);
      setSalida((ex as Error).message);
      setIsError(true);
    }
  };

  const activeFile = files.find(f => f.active);

  return (
    <div className="flex flex-col h-screen bg-gray-900 font-mono">
      <div className="flex flex-1 overflow-hidden">
        <SideBar 
          files={files} 
          addNewFile={addNewFile} 
          activateFile={activateFile}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <EditorTabs 
            files={files} 
            activateFile={activateFile} 
            closeFile={closeFile}
          />
          <div className="flex flex-1 overflow-hidden">
            {activeFile ? (
              <EditorPanel 
                file={activeFile}
                setCursorPosition={setCursorPosition}
                connectToDatabase={connectToDatabase}
                createSQLCode={createSQLCode}
                updateFileContent={updateFileContent}
                consultToDatabase={consultToDatabase}
              />
            ) : (
              <WelcomeScreen addNewFile={addNewFile} />
            )}
            <ResultsPanel salida={salida} sql={sql} isError={isError} />
          </div>
          <StatusBar 
            cursorPosition={cursorPosition}
            indentSize={indentSize}
            dbConnection={dbConnection}
            disconnectFromDatabase={disconnectFromDatabase}
          />
        </div>
      </div>
    </div>
  );
};

// Componente de pantalla de bienvenida
const WelcomeScreen = ({ addNewFile }: { addNewFile: () => void }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-800 text-gray-300">
      <h1 className="text-3xl font-bold mb-6">Bienvenido al IDE SQL</h1>
      <p className="text-lg mb-8 text-gray-400">Crea un nuevo archivo para comenzar</p>
      <button 
        onClick={addNewFile}
        className="px-6 py-3 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Nuevo archivo SQL
      </button>
    </div>
  );
};

// Componente para la barra lateral
const SideBar = ({ files, addNewFile, activateFile }: { files: File[]; addNewFile: () => void; activateFile: (id: number) => void }) => {
  return (
    <div className="w-56 bg-gray-800 text-gray-300 border-r border-gray-700">
      <div className="p-2 font-medium flex justify-between items-center">
        <span>GutYisuSQL</span>
        <button 
          onClick={addNewFile}
          className="p-1 rounded hover:bg-gray-700"
          title="Nuevo archivo SQL"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
      <div className="p-2 hover:bg-gray-700">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>LA2-U2</span>
        </div>
      </div>
      <div className="pl-6">
        {files.map(file => (
          <div 
            key={file.id}
            className={`p-2 cursor-pointer ${file.active ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            onClick={() => activateFile(file.id)}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>{file.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente para las pestañas del editor
const EditorTabs = ({ files, activateFile, closeFile }: { files: File[]; activateFile: (id: number) => void; closeFile: (id: number, e: React.MouseEvent<HTMLButtonElement>) => void }) => {
  if (files.length === 0) return null;
  
  return (
    <div className="flex bg-gray-900 border-b border-gray-700 overflow-x-auto">
      {files.map(file => (
        <div 
          key={file.id}
          onClick={() => activateFile(file.id)}
          className={`px-4 py-2 flex items-center cursor-pointer ${file.active ? 
            'bg-gray-800 text-gray-300' : 'bg-gray-900 text-gray-500'
          } border-r border-gray-700`}
        >
          <span>{file.name}</span>
          <button 
            onClick={(e) => closeFile(file.id, e)} 
            className="ml-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

// Componente para el editor Monaco
interface MonacoEditorProps {
  initialContent: string;
  fileName: string;
  setCursorPosition: (position: { lineNumber: number; column: number }) => void;
  onChange: (value: string) => void;
}

const MonacoEditor = ({ initialContent, fileName, setCursorPosition, onChange }: MonacoEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (editorRef.current && !monacoEditorRef.current) {
      const fileExtension = fileName.split('.').pop();
      let language = 'plaintext';
      
      if (fileExtension === 'gy') {
        language = 'sql';
      }

      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: content,
        language: language,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 14,
        fontFamily: "'Fira Code'",
      });

      // Configura el listener para cambios
      monacoEditorRef.current.onDidChangeModelContent(() => {
        const newValue = monacoEditorRef.current?.getValue() || '';
        setContent(newValue);
        onChange(newValue);
      });

      monacoEditorRef.current.onDidChangeCursorPosition(e => {
        setCursorPosition({
          lineNumber: e.position.lineNumber,
          column: e.position.column
        });
      });
    }

    return () => {
      monacoEditorRef.current?.dispose();
      monacoEditorRef.current = null;
    };
  }, [fileName]); // Solo dependemos de fileName

  // Actualización externa del contenido
  useEffect(() => {
    if (monacoEditorRef.current && initialContent !== content) {
      monacoEditorRef.current.setValue(initialContent);
      setContent(initialContent);
    }
  }, [initialContent]);

  return <div ref={editorRef} className="w-full h-full" />;
};

// Componente para el panel del editor
interface EditorPanelProps {
  file: File;
  setCursorPosition: (position: { lineNumber: number; column: number }) => void;
  connectToDatabase: () => void;
  createSQLCode: () => void;
  updateFileContent: (id: number, content: string) => void;
  consultToDatabase: () => void;
}

const EditorPanel = ({ 
  file, 
  setCursorPosition, 
  connectToDatabase, 
  createSQLCode,
  updateFileContent,
  consultToDatabase
}: EditorPanelProps) => {
  const handleEditorChange = useCallback((value: string) => {
    updateFileContent(file.id, value);
  }, [file.id, updateFileContent]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 bg-gray-800">
        <MonacoEditor 
          initialContent={file.content}
          fileName={file.name}
          setCursorPosition={setCursorPosition}
          onChange={handleEditorChange}
        />
      </div>
      <div className="flex justify-between items-center p-2 bg-gray-800 text-gray-300 border-t border-gray-700">
        <div className="flex space-x-2">
          <button 
            onClick={createSQLCode}
            className="cursor-pointer px-4 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Crear código SQL
          </button>
          <button 
            className="cursor-pointer px-4 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={connectToDatabase}
          >
            Conectar a BD
          </button>
          <button 
            className="cursor-pointer px-4 py-1 rounded bg-blue-700 hover:bg-purple-600 text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={consultToDatabase}
          >
            Consultar la BD
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para el panel de resultados
interface ResultsPanelProps {
  salida: string | null;
  sql: string | null;
  isError: boolean;
}

const ResultsPanel = ({ salida, sql, isError }: ResultsPanelProps) => {
  return (
    <div className="w-1/3 flex flex-col h-full border-l border-gray-700 overflow-hidden">
      {/* Sección de Código SQL generado */}
      <div className="flex-[3] bg-gray-800 flex flex-col overflow-hidden">
        <div className="p-2 font-medium text-gray-300 bg-gray-800 border-b border-gray-700">
          Código SQL generado
        </div>
        <div className="p-4 flex-1 overflow-auto font-mono text-sm bg-gray-900 text-gray-300">
          <pre className="whitespace-pre-wrap break-words">
            {sql || "No hay código SQL generado"}
          </pre>
        </div>
      </div>
      {/* Sección de Salida */}
      <div className="flex-[2] bg-gray-800 flex flex-col border-t border-gray-700 overflow-hidden">
        <div className="p-2 font-medium text-gray-300 bg-gray-800 border-b border-gray-700">
          Salida
        </div>
        <div className={`p-2 overflow-auto flex-1 bg-gray-900 font-mono text-sm ${isError ? 'text-red-500' : 'text-green-500'}`}>
          <pre className="whitespace-pre-wrap break-words">
            {salida || "No hay salida disponible"}
          </pre>
        </div>
      </div>
    </div>
  );
};

// Componente para la barra de estado
interface StatusBarProps {
  cursorPosition: { lineNumber: number; column: number };
  indentSize: number;
  dbConnection: { connected: boolean; name: string };
  disconnectFromDatabase: () => void;
}

const StatusBar = ({ 
  cursorPosition, 
  indentSize, 
  dbConnection,
  disconnectFromDatabase
}: StatusBarProps) => {
  return (
    <div className="flex justify-between items-center px-4 py-1 text-sm bg-gray-700 text-white">
      <div className="flex items-center space-x-4">
        <span>POSTGRESQL</span>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${dbConnection.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{dbConnection.name}</span>
          {dbConnection.connected && (
            <button 
              onClick={disconnectFromDatabase}
              className="ml-2 text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span>Línea {cursorPosition.lineNumber}, Columna {cursorPosition.column}</span>
        <span>Espacios: {indentSize}</span>
      </div>
    </div>
  );
};

export default IDE;