import { useState, useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import axios from 'axios';

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
        content: '-- Escribe su código GY aquí\n', 
        active: true 
      }
    ]);
  };

  interface File {
    id: number;
    name: string;
    content: string;
    active: boolean;
  }

  const activateFile = (id: number): void => {
    setFiles(files.map((file: File) => ({
      ...file,
      active: file.id === id
    })));
  };

  const closeFile = (id: number, e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    
    const fileToRemove = files.find((f: File) => f.id === id);
    if (fileToRemove && fileToRemove.active && files.length > 1) {
      const index = files.findIndex((f: File) => f.id === id);
      const nextActiveIndex = index === 0 ? 1 : index - 1;
      const updatedFiles = files.filter((f: File) => f.id !== id);
      updatedFiles[nextActiveIndex].active = true;
      setFiles(updatedFiles);
    } else {
      setFiles(files.filter((f: File) => f.id !== id));
    }
  };

  // Conectar a base de datos (simulación)
  const connectToDatabase = () => {
    setDbConnection({
      connected: true,
      name: 'Production'
    });
  };

  // Desconectar de base de datos (simulación)
  const disconnectFromDatabase = () => {
    setDbConnection({
      connected: false,
      name: 'Sin conexión'
    });
  };

  // Crear código SQL 
  const createSQLCode =async () => {
    try{
      const res = await axios.post('http://localhost:8080/grammar/getGrammar', {
        instruction:activeFile?.content
      })
      console.log('Data enviada:', activeFile?.content);
      if(res.data.errors.length > 0){
        console.error('Errores en el código SQL:', res.data.errors);
        setSalida(res.data.errors);
        setIsError(true);
      }else{
        setSalida("Código SQL generado");
        setSql(res.data.sql);
        setIsError(false);
      }
      console.log('Código SQL generado:', res.data);
    }
    catch(ex){
      console.error('Error al crear el código SQL:', ex);
    }
  }


  const activeFile = files.find(f => f.active);

  return (
    <div className="flex flex-col h-screen bg-gray-900 font-mono">
      <div className="flex flex-1">
        <SideBar 
          files={files} 
          addNewFile={addNewFile} 
          activateFile={activateFile}
        />
        <div className="flex flex-col flex-1">
          <EditorTabs 
            files={files} 
            activateFile={activateFile} 
            closeFile={closeFile}
          />
          <div className="flex flex-1">
            {activeFile ? (
              <EditorPanel 
                fileContent={activeFile.content}
                fileName={activeFile.name}
                setCursorPosition={setCursorPosition}
                connectToDatabase={connectToDatabase}
                createSQLCode={createSQLCode}
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

// Componente para la barra lateral (explorador en VSCode)
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
interface File {
  id: number;
  name: string;
  content: string;
  active: boolean;
}

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
const MonacoEditor = ({ content, fileName, setCursorPosition }: { content: string; fileName: string; setCursorPosition: (position: { lineNumber: number; column: number }) => void }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      if (monacoRef.current) {
        monacoRef.current.dispose();
      }

      // Detectar el lenguaje basado en la extensión del archivo
      const fileExtension = fileName.split('.').pop();
      let language = 'plaintext';
      
      if (fileExtension === 'gy') {
        language = 'sql';
      } else if (fileExtension === 'ts' || fileExtension === 'tsx') {
        language = 'typescript';
      } else if (fileExtension === 'js' || fileExtension === 'jsx') {
        language = 'javascript';
      }

      monacoRef.current = monaco.editor.create(editorRef.current, {
        value: content,
        language: language,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
          enabled: true
        },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: "'Fira Code'",
        lineNumbers: 'on',
        roundedSelection: false,
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          useShadows: false
        }
      });

      // Actualizar la posición del cursor cuando cambie
      monacoRef.current.onDidChangeCursorPosition(e => {
        setCursorPosition({
          lineNumber: e.position.lineNumber,
          column: e.position.column
        });
      });

      return () => {
        if (monacoRef.current) {
          monacoRef.current.dispose();
        }
      };
    }
  }, [content, fileName, setCursorPosition]);

  return (
    <div ref={editorRef} className="w-full h-full" />
  );
};

// Componente para el panel del editor
const EditorPanel = ({ fileContent, fileName, setCursorPosition, connectToDatabase, createSQLCode }: { fileContent: string; fileName: string; setCursorPosition: (position: { lineNumber: number; column: number }) => void; connectToDatabase: () => void; createSQLCode: () => void; }) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 bg-gray-800">
        <MonacoEditor 
          content={fileContent} 
          fileName={fileName}
          setCursorPosition={setCursorPosition}
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
        </div>
      </div>
    </div>
  );
};

// Componente para el panel de resultados
const ResultsPanel = ({ salida, sql, isError }: { salida: string | null; sql: string | null; isError: boolean }) => {
  return (
    <div className="w-1/3 flex flex-col border-l border-gray-700">
      <div className="flex-1 bg-gray-800 overflow-hidden flex flex-col">
        <div className="p-2 font-medium text-gray-300 bg-gray-800 border-b border-gray-700">
          Código SQL generado
        </div>
        <div className={`p-4 flex-1 overflow-auto font-mono text-sm bg-gray-900 text-gray-300 ${sql ? 'text-gray-300' : 'text-gray-500'}`}>
          <span className="text-gray-500">{sql}</span>
        </div>
      </div>
      <div className="h-1/4 bg-gray-800 flex flex-col border-t border-gray-700">
        <div className="p-2 font-medium text-gray-300 bg-gray-800 border-b border-gray-700">
          Salida
        </div>
        <div className={`p-2 overflow-auto flex-1 bg-gray-900 text-gray-300 ${isError ? 'text-red-500' : 'text-green-700'}`}>
          <div>{salida}</div>
        </div>
      </div>
    </div>
  );
};

// Componente para la barra de estado
const StatusBar = ({ cursorPosition, indentSize, dbConnection }: { cursorPosition: { lineNumber: number; column: number }; indentSize: number; dbConnection: { connected: boolean; name: string }; disconnectFromDatabase: () => void }) => {
  return (
    <div className="flex justify-between items-center px-4 py-1 text-sm bg-gray-700 text-white">
      <div className="flex items-center space-x-4">
        <span>POSTGRESQL</span>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${dbConnection.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{dbConnection.name}</span>
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