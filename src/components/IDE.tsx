import { useState, useRef, useCallback, useEffect } from "react";
import {
  Play,
  Plus,
  X,
  Database,
  Code,
  FileText,
  Copy,
  Check,
  Menu,
  Table,
  Loader2,
} from "lucide-react";
import axios from "axios";

interface File {
  id: number;
  name: string;
  content: string;
  active: boolean;
}

interface Table {
  name: string;
  columns: string[];
  selected: boolean;
}

const ResizeHandle = ({
  onMouseDown,
  className = "",
  direction = "horizontal",
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
  direction?: "horizontal" | "vertical";
}) => (
  <div
    className={`${
      direction === "horizontal"
        ? "w-1 cursor-col-resize hover:bg-blue-500"
        : "h-1 cursor-row-resize hover:bg-blue-500"
    } bg-gray-600 transition-colors ${className}`}
    onMouseDown={onMouseDown}
  />
);

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  onCursorPositionChange?: (line: number, column: number) => void;
  fileName?: string;
}

// Monaco Editor Component using CDN
const MonacoEditor = ({
  value,
  onChange,
  language = "gy",
  onCursorPositionChange,
  fileName = "",
}: MonacoEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Monaco Editor from CDN
    const loadMonaco = async () => {
      if ((window as any).monaco) {
        setIsLoaded(true);
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js";
      script.onload = () => {
        (window as any).require.config({
          paths: {
            vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
          },
        });
        (window as any).require(["vs/editor/editor.main"], () => {
          setIsLoaded(true);
        });
      };
      document.head.appendChild(script);
    };

    loadMonaco();
  }, []);

  useEffect(() => {
    if (!isLoaded || !editorRef.current || monacoEditorRef.current) return;

    const monaco = (window as any).monaco;
    if (!monaco) return;

    // Registrar el lenguaje .gy personalizado solo una vez
    if (
      !monaco.languages.getLanguages().find((lang: any) => lang.id === "gy")
    ) {
      monaco.languages.register({ id: "gy" });

      // Definir las reglas de tokenización para el lenguaje .gy
      monaco.languages.setMonarchTokensProvider("gy", {
        tokenizer: {
          root: [
            // Comentarios
            [/\/\/.*$/, "comment"],
            [/\/\*/, "comment", "@comment"],

            // Palabras clave principales (colores específicos)
            [/\b(inicio|fin)\b/, "keyword-main"],
            [/\b(hazme|metete|arma)\b/, "keyword-action"],
            [/\b(jalate)\b/, "keyword-control"],

            // Palabras de estructura
            [
              /\b(base de datos|tabla|campos?|llamada|que tenga|con los)\b/,
              "keyword-structure",
            ],
            [
              /\b(que|tenga|de los?|que sean|que tengan)\b/,
              "keyword-connector",
            ],

            // Tipos de datos
            [/\b(texto|numero|fecha|logico)\b/, "type-data"],

            // Operadores
            [/\bes\b/, "operator-assignment"],
            [/\by\b/, "operator-logical"],

            // Strings
            [/"([^"\\]|\\.)*"/, "string"],
            [/'([^'\\]|\\.)*'/, "string"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/'([^'\\]|\\.)*$/, "string.invalid"],

            // Números
            [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
            [/\d+/, "number"],

            // Identificadores
            [/[a-zA-Z_][a-zA-Z0-9_]*/, "identifier"],

            // Espacios en blanco
            [/[ \t\r\n]+/, "white"],
          ],

          comment: [
            [/[^\/*]+/, "comment"],
            [/\*\//, "comment", "@pop"],
            [/[\/*]/, "comment"],
          ],
        },
      });

      // Definir el tema de colores para el lenguaje .gy
      monaco.editor.defineTheme("gy-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [
          // Palabras clave principales
          { token: "keyword-main", foreground: "7c3aed", fontStyle: "bold" }, // Púrpura vibrante para inicio/fin
          { token: "keyword-action", foreground: "f59e0b", fontStyle: "bold" }, // Ámbar para hazme/metete/arma
          { token: "keyword-control", foreground: "ef4444", fontStyle: "bold" }, // Rojo para jalate

          // Palabras de estructura
          {
            token: "keyword-structure",
            foreground: "06b6d4",
            fontStyle: "bold",
          }, // Cian para estructura
          {
            token: "keyword-connector",
            foreground: "8b5cf6",
            fontStyle: "italic",
          }, // Violeta para conectores

          // Tipos de datos
          { token: "type-data", foreground: "10b981", fontStyle: "bold" }, // Verde esmeralda

          // Operadores
          {
            token: "operator-assignment",
            foreground: "fb923c",
            fontStyle: "bold",
          }, // Naranja brillante para 'es'
          { token: "operator-logical", foreground: "fbbf24" }, // Amarillo para 'y'

          // Otros elementos
          { token: "string", foreground: "a3e635" }, // Verde lima para strings
          { token: "number", foreground: "60a5fa" }, // Azul claro para números
          { token: "number.float", foreground: "60a5fa" },
          { token: "comment", foreground: "6b7280", fontStyle: "italic" }, // Gris para comentarios
          { token: "identifier", foreground: "e5e7eb" }, // Gris claro para identificadores
        ],
        colors: {
          "editor.background": "#1e1e1e",
          "editor.foreground": "#d4d4d4",
          "editor.lineHighlightBackground": "#2d2d30",
          "editorLineNumber.foreground": "#6b7280",
          "editorLineNumber.activeForeground": "#ffffff",
        },
      });
    }

    // Determinar el lenguaje - SIMPLIFICADO
    let editorLanguage = "gy"; // Por defecto usar gy

    // Solo cambiar si específicamente se pasa otro lenguaje o extensión
    if (language && language !== "gy") {
      editorLanguage = language;
    } else if (fileName && !fileName.endsWith(".gy")) {
      const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
      const languageMap: { [key: string]: string } = {
        java: "java",
        sql: "sql",
        js: "javascript",
        ts: "typescript",
        py: "python",
      };
      editorLanguage = languageMap[fileExtension] || "gy";
    }

    monacoEditorRef.current = monaco.editor.create(editorRef.current, {
      value: value,
      language: editorLanguage,
      theme: editorLanguage === "gy" ? "gy-theme" : "vs-dark",
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
      scrollBeyondLastLine: false,
      wordWrap: "on",
      lineNumbers: "on",
      renderLineHighlight: "line",
      selectOnLineNumbers: true,
    });

    // Handle content changes
    monacoEditorRef.current.onDidChangeModelContent(() => {
      const newValue = monacoEditorRef.current?.getValue() || "";
      onChange(newValue);
    });

    // Handle cursor position changes
    if (onCursorPositionChange) {
      monacoEditorRef.current.onDidChangeCursorPosition((e: any) => {
        onCursorPositionChange(e.position.lineNumber, e.position.column);
      });
    }

    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        monacoEditorRef.current = null;
      }
    };
  }, [isLoaded, language, fileName]);

  // Update editor value when prop changes
  useEffect(() => {
    if (
      monacoEditorRef.current &&
      monacoEditorRef.current.getValue() !== value
    ) {
      monacoEditorRef.current.setValue(value);
    }
  }, [value]);

  if (!isLoaded) {
    return (
      <div className="flex h-full bg-gray-900 items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span>Cargando editor...</span>
        </div>
      </div>
    );
  }

  return <div ref={editorRef} className="w-full h-full" />;
};

const IDE = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [cursorPosition, setCursorPosition] = useState({
    lineNumber: 1,
    column: 1,
  });
  const [salida, setSalida] = useState<string | null>(
    "Listo para generar código SQL"
  );
  const [sql, setSql] = useState<string | null>(null);
  const [pythonCode, setPythonCode] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingPython, setGeneratingPython] = useState(false);
  const [createdDatabase, setCreatedDatabase] = useState<string | null>(null);
  const [creatingDatabase, setCreatingDatabase] = useState(false);

  // Layout state
  const [rightPanelWidth, setRightPanelWidth] = useState(50); // percentage
  const [bottomPanelHeight, setBottomPanelHeight] = useState(120); // pixels
  const [sidebarWidth, setSidebarWidth] = useState(280); // pixels

  const containerRef = useRef<HTMLDivElement>(null);

  const extractDatabaseCommands = (sql: string): string | null => {
    if (!sql) return null;

    const lines = sql.split("\n");
    const dbCommands = lines.filter((line) => {
      const trimmed = line.trim().toUpperCase();
      return (
        trimmed.startsWith("CREATE DATABASE") || trimmed.startsWith("USE ")
      );
    });

    return dbCommands.length > 0 ? dbCommands.join("\n") : null;
  };

  // 3. Función para extraer el nombre de la BD
  const extractDatabaseName = (sql: string): string | null => {
    if (!sql) return null;

    const lines = sql.split("\n");
    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();
      if (trimmed.startsWith("CREATE DATABASE")) {
        const match = line.match(/CREATE DATABASE\s+([^;]+)/i);
        if (match) {
          return match[1].trim();
        }
      }
    }
    return null;
  };

  // Resize handlers
  const handleRightPanelResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        const containerWidth = containerRect.width - sidebarWidth;
        const newWidth = Math.max(
          30,
          Math.min(70, rightPanelWidth - (deltaX / containerWidth) * 100)
        );
        setRightPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [rightPanelWidth, sidebarWidth]
  );

  const handleBottomPanelResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = startY - e.clientY;
        const newHeight = Math.max(
          80,
          Math.min(300, bottomPanelHeight + deltaY)
        );
        setBottomPanelHeight(newHeight);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [bottomPanelHeight]
  );

  const handleSidebarResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(200, Math.min(400, sidebarWidth + deltaX));
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [sidebarWidth]
  );

  const addNewFile = () => {
    const newId =
      files.length > 0 ? Math.max(...files.map((f) => f.id)) + 1 : 1;
    const newFileName = `archivo${newId}.gy`; // Cambiar de .gy a .gy

    const updatedFiles = files.map((file) => ({
      ...file,
      active: false,
    }));

    setFiles([
      ...updatedFiles,
      {
        id: newId,
        name: newFileName,
        content: `inicio
    hazme la base de datos ejemplo
    metete a la base de datos ejemplo
    arma una tabla de usuarios
    con los campos
        nombre es texto
        edad es numero
        activo es logico
fin`,
        active: true,
      },
    ]);
  };

  const updateFileContent = (id: number, newContent: string) => {
    setFiles(
      files.map((file) =>
        file.id === id ? { ...file, content: newContent } : file
      )
    );
  };

  const activateFile = (id: number): void => {
    setFiles(
      files.map((file) => ({
        ...file,
        active: file.id === id,
      }))
    );
  };

  const closeFile = (
    id: number,
    e: React.MouseEvent<HTMLButtonElement>
  ): void => {
    e.stopPropagation();

    const fileToRemove = files.find((f) => f.id === id);
    if (fileToRemove && fileToRemove.active && files.length > 1) {
      const index = files.findIndex((f) => f.id === id);
      const nextActiveIndex = index === 0 ? 1 : index - 1;
      const updatedFiles = files.filter((f) => f.id !== id);
      updatedFiles[nextActiveIndex].active = true;
      setFiles(updatedFiles);
    } else {
      setFiles(files.filter((f) => f.id !== id));
    }
  };

  const parseTablesFromSQL = (sqlCode: string): Table[] => {
    const tables: Table[] = [];
    const createTableRegex = /CREATE TABLE\s+(\w+)\s*\((.*?)\);/gis;
    let match;

    while ((match = createTableRegex.exec(sqlCode)) !== null) {
      const tableName = match[1];
      const columnsString = match[2];

      const columnLines = columnsString
        .split(",")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const columns = columnLines
        .filter((line) => !line.toUpperCase().includes("FOREIGN KEY"))
        .map((line) => {
          const parts = line.trim().split(/\s+/);
          return parts[0];
        });

      tables.push({
        name: tableName,
        columns: columns,
        selected: false,
      });
    }

    return tables;
  };

  const createDatabase = async () => {
    const dbCommands = extractDatabaseCommands(sql || "");
    if (!dbCommands) return;

    setCreatingDatabase(true);
    setSalida("Creando base de datos...");

    try {
      const res = await axios.post("http://localhost:8080/db/create", {
        sql: dbCommands,
      });

      const dbName = extractDatabaseName(sql || "");
      setCreatedDatabase(dbName);
      setSalida(`Base de datos '${dbName}' creada correctamente`);
      setIsError(false);
    } catch (ex) {
      console.error("Error al crear la base de datos:", ex);
      setSalida(`Error al crear la base de datos: ${(ex as Error).message}`);
      setIsError(true);
    } finally {
      setCreatingDatabase(false);
    }
  };

  const createSQLCode = async () => {
    const activeFile = files.find((f) => f.active);
    if (!activeFile) return;

    if (!activeFile.content.trim()) {
      setSalida("El archivo está vacío. Por favor, escribe una instrucción.");
      return;
    }
    setLoading(true);
    setSql(null); // Clear previous SQL
    setSalida("Generando código SQL...");

    // Esperar 2 segundos antes de hacer la petición
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const res = await axios.post("http://localhost:8080/grammar/getGrammar", {
        instruction: activeFile.content,
      });

      if (res.data.errors && res.data.errors.length > 0) {
        setSalida(res.data.errors);
        setIsError(true);
        setSql(null);
        setTables([]);
      } else {
        setSalida("Código SQL generado correctamente");
        setSql(res.data.sql ?? null);
        setIsError(false);

        const parsedTables = parseTablesFromSQL(res.data.sql ?? "");
        setTables(parsedTables);
      }
    } catch (ex) {
      setSalida((ex as Error).message);
      setIsError(true);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setTables(
      tables.map((table) =>
        table.name === tableName
          ? { ...table, selected: !table.selected }
          : table
      )
    );
  };

  const generatePythonCode = async () => {
    const selectedTables = tables.filter((table) => table.selected);
    if (selectedTables.length === 0) return;

    setGeneratingPython(true);
    setSalida("Generando código Python...");

    // Simular delay de generación
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Usar la BD creada o una por defecto
    const databaseName = createdDatabase || "test_db";

    let pythonCode = `import psycopg2
import pandas as pd
from sqlalchemy import create_engine

# 🔧 Configuración de conexión a la base de datos
DATABASE_CONFIG = {
    'host': 'localhost',
    'database': '${databaseName}', 
    'user': 'postgres',     
    'password': 'password', 
    'port': '5432'
}

def create_connection():
    """🔗 Crear conexión a PostgreSQL"""
    try:
        connection = psycopg2.connect(**DATABASE_CONFIG)
        return connection
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return None

def create_engine_connection():
    """⚙️ Crear engine para pandas"""
    connection_string = f"postgresql://{DATABASE_CONFIG['user']}:{DATABASE_CONFIG['password']}@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}"
    return create_engine(connection_string)

`;

    selectedTables.forEach((table) => {
      // Filtrar columnas (excluir ID autogenerados)
      const insertColumns = table.columns.filter(
        (col) =>
          !col.toLowerCase().includes("id") ||
          (!col.toLowerCase().endsWith("_id") && col.toLowerCase() !== "id")
      );

      const allColumns = table.columns;
      const placeholders = insertColumns.map(() => "%s").join(", ");
      const updateColumns = insertColumns.filter((col) => col !== "id");
      const updatePlaceholders = updateColumns
        .map((col) => `${col} = %s`)
        .join(", ");

      pythonCode += `
# 📊 Funciones para la tabla ${table.name}
def get_all_${table.name}():
    """Obtiene todos los registros de ${table.name}"""
    try:
        engine = create_engine_connection()
        query = "SELECT * FROM ${table.name}"
        df = pd.read_sql(query, engine)
        print(f"✅ Se obtuvieron {len(df)} registros de ${table.name}")
        return df
    except Exception as e:
        print(f"❌ Error obteniendo datos de ${table.name}: {e}")
        return pd.DataFrame()

def get_${table.name}_by_id(record_id):
    """Obtiene un registro específico de ${table.name} por ID"""
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            # Buscar cualquier columna que termine en 'id'
            id_column = next((col for col in ${JSON.stringify(
              allColumns
            )} if 'id' in col.lower()), '${allColumns[0]}')
            query = f"SELECT * FROM ${table.name} WHERE {id_column} = %s"
            cursor.execute(query, (record_id,))
            result = cursor.fetchone()
            if result:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, result))
            return None
        except Exception as e:
            print(f"❌ Error obteniendo registro: {e}")
            return None
        finally:
            cursor.close()
            connection.close()

def insert_${table.name}(${insertColumns.join(", ")}):
    """➕ Inserta un nuevo registro en ${table.name}"""
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            query = """INSERT INTO ${table.name} (${insertColumns.join(", ")})
                       VALUES (${placeholders}) RETURNING *"""
            cursor.execute(query, (${insertColumns.join(", ")}))
            result = cursor.fetchone()
            connection.commit()
            
            if result:
                columns = [desc[0] for desc in cursor.description]
                record = dict(zip(columns, result))
                print(f"✅ Registro insertado en ${table.name}: {record}")
                return record
            return None
        except Exception as e:
            print(f"❌ Error insertando en ${table.name}: {e}")
            connection.rollback()
            return None
        finally:
            cursor.close()
            connection.close()

def update_${table.name}(record_id, ${updateColumns.join(", ")}):
    """🔄 Actualiza un registro en ${table.name}"""
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            # Buscar la columna ID
            id_column = next((col for col in ${JSON.stringify(
              allColumns
            )} if 'id' in col.lower()), '${allColumns[0]}')
            query = f"""UPDATE ${table.name} 
                       SET ${updatePlaceholders}
                       WHERE {id_column} = %s 
                       RETURNING *"""
            cursor.execute(query, (${updateColumns.join(", ")}, record_id))
            result = cursor.fetchone()
            connection.commit()
            
            if result:
                columns = [desc[0] for desc in cursor.description]
                record = dict(zip(columns, result))
                print(f"✅ Registro actualizado en ${table.name}: {record}")
                return record
            else:
                print(f"⚠️ No se encontró registro con ID {record_id} en ${
                  table.name
                }")
                return None
        except Exception as e:
            print(f"❌ Error actualizando ${table.name}: {e}")
            connection.rollback()
            return None
        finally:
            cursor.close()
            connection.close()

def delete_${table.name}(record_id):
    """🗑️ Elimina un registro de ${table.name}"""
    connection = create_connection()
    if connection:
        try:
            cursor = connection.cursor()
            id_column = next((col for col in ${JSON.stringify(
              allColumns
            )} if 'id' in col.lower()), '${allColumns[0]}')
            query = f"DELETE FROM ${
              table.name
            } WHERE {id_column} = %s RETURNING *"
            cursor.execute(query, (record_id,))
            result = cursor.fetchone()
            connection.commit()
            
            if result:
                print(f"✅ Registro eliminado de ${
                  table.name
                } con ID: {record_id}")
                return True
            else:
                print(f"⚠️ No se encontró registro con ID {record_id} en ${
                  table.name
                }")
                return False
        except Exception as e:
            print(f"❌ Error eliminando de ${table.name}: {e}")
            connection.rollback()
            return False
        finally:
            cursor.close()
            connection.close()
`;
    });

    // Generar ejemplos de uso más robustos
    pythonCode += `
# 🚀 Ejemplos de uso y pruebas
def test_database_operations():
    """🧪 Función de prueba para validar todas las operaciones"""
    print("=" * 60)
    print("🧪 INICIANDO PRUEBAS DE BASE DE DATOS")
    print("=" * 60)
    
    # Verificar conexión
    connection = create_connection()
    if not connection:
        print("❌ No se pudo conectar a la base de datos")
        return
    connection.close()
    print("✅ Conexión a base de datos exitosa")
    print()

${selectedTables
  .map((table) => {
    const insertColumns = table.columns.filter(
      (col) =>
        !col.toLowerCase().includes("id") ||
        (!col.toLowerCase().endsWith("_id") && col.toLowerCase() !== "id")
    );

    // Generar valores de ejemplo basados en nombres de columnas
    interface GenerateExampleValue {
      (columnName: string): string;
    }

    const generateExampleValue: GenerateExampleValue = (columnName) => {
      const col = columnName.toLowerCase();
      if (col.includes("nombre") || col.includes("name")) return "'Juan Pérez'";
      if (col.includes("edad") || col.includes("age")) return "25";
      if (col.includes("email") || col.includes("correo"))
        return "'juan@example.com'";
      if (col.includes("activo") || col.includes("active")) return "True";
      if (col.includes("fecha") || col.includes("date")) return "'2024-01-01'";
      if (col.includes("precio") || col.includes("price")) return "99.99";
      if (col.includes("telefono") || col.includes("phone"))
        return "'555-1234'";
      // Valores por defecto según tipo probable
      if (
        col.includes("texto") ||
        col.includes("text") ||
        col.includes("string")
      )
        return "'Ejemplo'";
      if (col.includes("numero") || col.includes("num") || col.includes("int"))
        return "100";
      if (col.includes("logico") || col.includes("bool")) return "True";
      return "'Valor ejemplo'"; // Valor por defecto
    };

    const exampleValues = insertColumns.map(generateExampleValue);
    const updateValues = insertColumns
      .filter((col) => col !== "id")
      .map(generateExampleValue);

    return `    # === PRUEBAS PARA TABLA ${table.name.toUpperCase()} ===
    print(f"📋 Probando operaciones en tabla: ${table.name}")
    
    # 1. Obtener todos los registros iniciales
    print("\\n1️⃣ Obteniendo todos los registros...")
    df_inicial = get_all_${table.name}()
    print(f"Registros iniciales: {len(df_inicial) if not df_inicial.empty else 0}")
    
    # 2. Insertar nuevo registro
    print("\\n2️⃣ Insertando nuevo registro...")
    nuevo_registro = insert_${table.name}(${exampleValues.join(", ")})
    
    if nuevo_registro:
        record_id = list(nuevo_registro.values())[0]  # Primer valor (usualmente el ID)
        print(f"✅ Registro creado con ID: {record_id}")
        
        # 3. Obtener el registro específico
        print("\\n3️⃣ Obteniendo registro específico...")
        registro_obtenido = get_${table.name}_by_id(record_id)
        if registro_obtenido:
            print(f"✅ Registro encontrado: {registro_obtenido}")
        
        # 4. Actualizar el registro
        print("\\n4️⃣ Actualizando registro...")
        registro_actualizado = update_${
          table.name
        }(record_id, ${updateValues.join(", ")})
        
        # 5. Verificar actualización
        if registro_actualizado:
            print("\\n5️⃣ Verificando actualización...")
            registro_verificado = get_${table.name}_by_id(record_id)
            print(f"✅ Registro después de actualizar: {registro_verificado}")
        
        # 6. Obtener todos los registros finales
        print("\\n6️⃣ Obteniendo todos los registros finales...")
        df_final = get_all_${table.name}()
        print(f"Registros finales: {len(df_final) if not df_final.empty else 0}")
        
        # Opcional: Eliminar el registro de prueba (descomenta si quieres)
        # print("\\n7️⃣ Eliminando registro de prueba...")
        # delete_${table.name}(record_id)
        
    print("-" * 50)
`;
  })
  .join("\n")}

if __name__ == "__main__":
    print("🐍 CÓDIGO PYTHON PARA OPERACIONES DE BASE DE DATOS")
    print("📋 Tablas incluidas: ${selectedTables
      .map((t) => t.name)
      .join(", ")}")
    print()
    
    # Ejecutar las pruebas
    test_database_operations()
    
    print("\\n" + "=" * 60)
    print("✅ PRUEBAS COMPLETADAS")
    print("💡 Para usar en producción:")
    print("   1. Actualiza DATABASE_CONFIG con tus credenciales")
    print("   2. Asegúrate de que las tablas existan en tu BD")
    print("   3. Instala las dependencias: pip install psycopg2 pandas sqlalchemy")
    print("=" * 60)
`;

    setPythonCode(pythonCode);
    setSalida("🐍 Código Python funcional generado exitosamente");
    setIsError(false);
    setGeneratingPython(false);
  };

  // 3. Agregar función para seleccionar/deseleccionar todas las tablas
  const toggleAllTables = () => {
    const allSelected = tables.every((table) => table.selected);
    setTables(
      tables.map((table) => ({
        ...table,
        selected: !allSelected,
      }))
    );
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const activeFile = files.find((f) => f.active);
  const selectedTablesCount = tables.filter((table) => table.selected).length;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen bg-gray-900 font-sans overflow-hidden"
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          style={{ width: sidebarWidth }}
          className="bg-gray-800 text-gray-300 border-r border-gray-700 flex-shrink-0"
        >
          <SideBar
            files={files}
            addNewFile={addNewFile}
            activateFile={activateFile}
          />
        </div>

        {/* Sidebar Resize Handle */}
        <ResizeHandle
          onMouseDown={handleSidebarResize}
          direction="horizontal"
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          <EditorTabs
            files={files}
            activateFile={activateFile}
            closeFile={closeFile}
          />

          <div className="flex flex-1 overflow-hidden">
            {/* Editor Panel */}
            <div
              style={{ width: `${100 - rightPanelWidth}%` }}
              className="flex flex-col overflow-hidden"
            >
              {activeFile ? (
                <EditorPanel
                  file={activeFile}
                  setCursorPosition={setCursorPosition}
                  createSQLCode={createSQLCode}
                  updateFileContent={updateFileContent}
                  loading={loading}
                  sql={sql}
                  createDatabase={createDatabase}
                  creatingDatabase={creatingDatabase}
                  createdDatabase={createdDatabase}
                  extractDatabaseCommands={extractDatabaseCommands}
                />
              ) : (
                <WelcomeScreen addNewFile={addNewFile} />
              )}
            </div>

            {/* Right Panel Resize Handle */}
            <ResizeHandle
              onMouseDown={handleRightPanelResize}
              direction="horizontal"
            />

            {/* Results Panel */}
            <div
              style={{ width: `${rightPanelWidth}%` }}
              className="flex flex-col overflow-hidden"
            >
              <div
                className="flex-1 overflow-hidden"
                style={{ height: `calc(100% - ${bottomPanelHeight}px)` }}
              >
                <ResultsPanel
                  salida={salida}
                  sql={sql}
                  pythonCode={pythonCode}
                  isError={isError}
                  tables={tables}
                  toggleTableSelection={toggleTableSelection}
                  generatePythonCode={generatePythonCode}
                  selectedTablesCount={selectedTablesCount}
                  copyToClipboard={copyToClipboard}
                  copied={copied}
                  generatingPython={generatingPython}
                  toggleAllTables={toggleAllTables}
                  loading={loading}
                />
              </div>

              {/* Bottom Panel Resize Handle */}
              <ResizeHandle
                onMouseDown={handleBottomPanelResize}
                direction="vertical"
              />

              {/* Status Panel */}
              <div
                style={{ height: bottomPanelHeight }}
                className="bg-gray-800 border-t border-gray-700 flex flex-col overflow-hidden"
              >
                <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center space-x-2">
                  <Menu className="w-4 h-4 text-gray-400" />
                  <h4 className="font-medium text-gray-300 text-sm">
                    Estado del Sistema
                  </h4>
                </div>
                <div
                  className={`p-3 overflow-auto flex-1 bg-gray-900 text-sm font-medium ${
                    isError ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span>Generando código SQL...</span>
                    </div>
                  ) : (
                    salida || "Sistema listo"
                  )}
                </div>
              </div>
            </div>
          </div>

          <StatusBar cursorPosition={cursorPosition} />
        </div>
      </div>
    </div>
  );
};

const WelcomeScreen = ({ addNewFile }: { addNewFile: () => void }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-gray-300">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white">
            GutYisu<span className="text-blue-400">SQL</span>
          </h1>
          <p className="text-xl text-gray-400">
            IDE avanzado para generación de código SQL
          </p>
        </div>

        <div className="space-y-4 items-center flex flex-col">
          <p className="text-lg text-gray-300">¿Listo para comenzar?</p>
          <button
            onClick={addNewFile}
            className="group px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 flex items-center space-x-3 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-6 h-6" />
            <span>Crear nuevo archivo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const SideBar = ({
  files,
  addNewFile,
  activateFile,
}: {
  files: File[];
  addNewFile: () => void;
  activateFile: (id: number) => void;
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-lg">GutYisuSQL</span>
          </div>
          <button
            onClick={addNewFile}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-gray-400 hover:text-white"
            title="Nuevo archivo"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-2 overflow-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              file.active
                ? "bg-blue-600 text-white shadow-md"
                : "hover:bg-gray-700"
            }`}
            onClick={() => activateFile(file.id)}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4" />
              <span className="truncate flex-1">{file.name}</span>
            </div>
          </div>
        ))}

        {files.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay archivos abiertos</p>
            <p className="text-sm mt-2">Crea un archivo para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EditorTabs = ({
  files,
  activateFile,
  closeFile,
}: {
  files: File[];
  activateFile: (id: number) => void;
  closeFile: (id: number, e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  if (files.length === 0) return null;

  return (
    <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => activateFile(file.id)}
          className={`group px-6 py-3 flex items-center cursor-pointer transition-all duration-200 ${
            file.active
              ? "bg-gray-900 text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
          } border-r border-gray-700`}
        >
          <span className="mr-3">{file.name}</span>
          <button
            onClick={(e) => closeFile(file.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-600 transition-all duration-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

interface EditorPanelProps {
  file: File;
  setCursorPosition: (position: { lineNumber: number; column: number }) => void;
  createSQLCode: () => void;
  updateFileContent: (id: number, content: string) => void;
  loading: boolean;
  sql: string | null;
  createDatabase: () => void;
  creatingDatabase: boolean;
  createdDatabase: string | null;
  extractDatabaseCommands: (sql: string) => string | null;
}

const EditorPanel = ({
  file,
  setCursorPosition,
  createSQLCode,
  updateFileContent,
  loading,
  sql,
  createDatabase,
  creatingDatabase,
  createdDatabase,
  extractDatabaseCommands,
}: EditorPanelProps) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 bg-gray-900 overflow-hidden">
        <MonacoEditor
          value={file.content}
          onChange={(content) => updateFileContent(file.id, content)}
          language="gy"
          onCursorPositionChange={(line, column) =>
            setCursorPosition({ lineNumber: line, column })
          }
        />
      </div>

      <div className="flex justify-between items-center p-4 bg-gray-800 border-t border-gray-700 flex-shrink-0">
        <div className="flex space-x-3">
          <button
            onClick={createSQLCode}
            disabled={loading}
            className="cursor-pointer group px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 flex items-center space-x-2 shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Generar SQL</span>
              </>
            )}
          </button>

          {/* Nuevo botón para crear BD */}
          <button
            onClick={createDatabase}
            disabled={!extractDatabaseCommands(sql || "") || creatingDatabase}
            className="cursor-pointer group px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 flex items-center space-x-2 shadow-md"
          >
            {creatingDatabase ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creando BD...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Crear BD</span>
              </>
            )}
          </button>
        </div>
        {/* Indicador de BD creada */}
        {createdDatabase && (
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400">BD: {createdDatabase}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ResultsPanelProps {
  salida: string | null;
  sql: string | null;
  pythonCode: string | null;
  isError: boolean;
  tables: Table[];
  toggleTableSelection: (tableName: string) => void;
  generatePythonCode: () => void;
  selectedTablesCount: number;
  copyToClipboard: (text: string, type: string) => void;
  copied: string | null;
  generatingPython: boolean;
  toggleAllTables: () => void;
  loading: boolean;
}

const ResultsPanel = ({
  salida,
  sql,
  pythonCode,
  isError,
  tables,
  toggleTableSelection,
  generatePythonCode,
  selectedTablesCount,
  copyToClipboard,
  copied,
  generatingPython,
  toggleAllTables,
}: ResultsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"sql" | "tables" | "python">(
    "sql"
  );

  // Función mejorada para generar código Python y cambiar de pestaña
  const handleGeneratePython = () => {
    generatePythonCode();
    // Cambiar automáticamente a la pestaña de Python
    setActiveTab("python");
  };

  const highlightSQL = (sql: string) => {
    if (!sql) return null;

    const keywords = [
      "SELECT",
      "FROM",
      "WHERE",
      "JOIN",
      "LEFT",
      "RIGHT",
      "INNER",
      "OUTER",
      "GROUP BY",
      "ORDER BY",
      "HAVING",
      "LIMIT",
      "OFFSET",
      "INSERT",
      "UPDATE",
      "DELETE",
      "CREATE",
      "ALTER",
      "DROP",
      "TABLE",
      "VIEW",
      "INDEX",
      "TRIGGER",
      "PRIMARY",
      "KEY",
      "FOREIGN",
      "REFERENCES",
      "SERIAL",
      "INTEGER",
      "VARCHAR",
      "BOOLEAN",
      "DATE",
      "TIMESTAMP",
      "DEFAULT",
      "NOT NULL",
      "UNIQUE",
      "DECIMAL",
    ];

    return sql.split("\n").map((line, lineIndex) => (
      <div
        key={lineIndex}
        className="hover:bg-gray-800 px-2 py-1 rounded font-mono"
      >
        {line
          .split(new RegExp(`\\b(${keywords.join("|")})\\b`, "gi"))
          .map((part, partIndex) => {
            if (
              keywords.some((kw) => kw.toLowerCase() === part.toLowerCase())
            ) {
              return (
                <span key={partIndex} className="text-blue-400 font-semibold">
                  {part}
                </span>
              );
            }
            if (part.includes("'")) {
              return (
                <span key={partIndex} className="text-green-400">
                  {part}
                </span>
              );
            }
            if (/^\d+$/.test(part.trim())) {
              return (
                <span key={partIndex} className="text-orange-400">
                  {part}
                </span>
              );
            }
            return <span key={partIndex}>{part}</span>;
          })}
      </div>
    ));
  };

  const highlightPython = (code: string) => {
    if (!code) return null;

    return code.split("\n").map((line, lineIndex) => (
      <div
        key={lineIndex}
        className="hover:bg-gray-800 px-2 py-1 rounded font-mono text-sm"
      >
        {line.includes("#") ? (
          <span className="text-gray-500 italic">{line}</span>
        ) : line.includes("def ") ? (
          <span className="text-purple-400 font-semibold">{line}</span>
        ) : line.includes("import ") || line.includes("from ") ? (
          <span className="text-yellow-400">{line}</span>
        ) : line.includes('"') || line.includes("'") ? (
          <span className="text-green-400">{line}</span>
        ) : line.includes("if __name__") ? (
          <span className="text-blue-400">{line}</span>
        ) : (
          <span>{line}</span>
        )}
      </div>
    ));
  };

  const allTablesSelected =
    tables.length > 0 && tables.every((table) => table.selected);

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      {/* Header con Tabs */}
      <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
        {[
          { key: "sql", label: "SQL", icon: Database, count: sql ? 1 : 0 },
          { key: "tables", label: "Tablas", icon: Table, count: tables.length },
          {
            key: "python",
            label: "Python",
            icon: Code,
            count: pythonCode ? 1 : 0,
          },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 transition-all duration-200 whitespace-nowrap relative ${
              activeTab === key
                ? "bg-gray-900 text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {count > 0 && (
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === key ? "bg-blue-600" : "bg-gray-600"
                }`}
              >
                {count}
              </span>
            )}
            {/* Indicador de loading para Python con círculo girando */}
            {key === "python" && generatingPython && (
              <div className="absolute -top-1 -right-1">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-spin border-2 border-green-300 border-t-transparent"></div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "sql" && (
          <div className="h-full">
            {sql ? (
              <div className="h-full flex flex-col">
                <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <h4 className="font-medium text-gray-300">
                      Código SQL Generado
                    </h4>
                  </div>
                  <button
                    onClick={() => copyToClipboard(sql, "sql")}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center space-x-2 transition-colors duration-200 shadow-sm"
                  >
                    {copied === "sql" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copied === "sql" ? "Copiado!" : "Copiar"}</span>
                  </button>
                </div>
                <div className="flex-1 p-4 text-gray-300 overflow-auto bg-gray-900">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                      {highlightSQL(sql)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <div className="text-center space-y-4">
                  <Database className="w-20 h-20 mx-auto opacity-30" />
                  <div>
                    <p className="text-lg font-medium text-gray-400">
                      Sin código SQL generado
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Escribe una instrucción en el editor y presiona "Generar
                      SQL" para ver el resultado aquí
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "tables" && (
          <div className="h-full">
            {tables.length > 0 ? (
              <div className="h-full flex flex-col">
                <div className="p-3 bg-gray-800 border-b border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-2">
                      <Table className="w-4 h-4 text-green-400" />
                      <h4 className="font-medium text-gray-300">
                        Tablas Detectadas
                      </h4>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-400">
                        {selectedTablesCount} de {tables.length} seleccionadas
                      </span>
                      <button
                        onClick={handleGeneratePython}
                        disabled={selectedTablesCount === 0 || generatingPython}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors duration-200 shadow-sm border border-gray-500 cursor-pointer"
                      >
                        <div className="flex items-center space-x-1">
                          {generatingPython ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Generando...</span>
                            </>
                          ) : (
                            <>
                              <Code className="w-3 h-3" />
                              <span>Generar Python</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Controles de selección */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={toggleAllTables}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                          allTablesSelected
                            ? "bg-blue-600 border-blue-600"
                            : selectedTablesCount > 0 &&
                              selectedTablesCount < tables.length
                            ? "bg-blue-600 border-blue-600 opacity-50"
                            : "border-blue-400"
                        }`}
                      >
                        {allTablesSelected && (
                          <Check className="w-2 h-2 text-white" />
                        )}
                        {selectedTablesCount > 0 &&
                          selectedTablesCount < tables.length &&
                          !allTablesSelected && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                      </div>
                      <span>
                        {allTablesSelected
                          ? "Deseleccionar todas"
                          : "Seleccionar todas"}
                      </span>
                    </button>

                    {selectedTablesCount > 0 && (
                      <div className="text-xs text-purple-300 bg-purple-900 bg-opacity-40 px-3 py-1 rounded-full border border-purple-600 flex items-center space-x-2 shadow-sm">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <span>
                          {selectedTablesCount} tabla
                          {selectedTablesCount !== 1 ? "s" : ""} lista
                          {selectedTablesCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-auto space-y-3">
                  {tables.map((table, index) => (
                    <div
                      key={table.name}
                      className={`bg-gray-800 rounded-lg border transition-all duration-300 transform ${
                        table.selected
                          ? "border-blue-500 shadow-lg scale-[1.02]"
                          : "border-gray-700 hover:border-gray-600 hover:scale-[1.01]"
                      }`}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between rounded-lg"
                        onClick={() => toggleTableSelection(table.name)}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              table.selected
                                ? "bg-blue-600 border-blue-600 shadow-md scale-110"
                                : "border-gray-500 hover:border-gray-400"
                            }`}
                          >
                            {table.selected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">
                              {table.name}
                            </span>
                            <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                              <span>
                                {table.columns.length} columna
                                {table.columns.length !== 1 ? "s" : ""}
                              </span>
                              {table.selected && (
                                <span className="text-blue-400 flex items-center space-x-1">
                                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                  <span>Seleccionada</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm px-2 py-1 rounded transition-colors duration-200 ${
                              table.selected
                                ? "text-blue-300 bg-blue-900"
                                : "text-gray-500 bg-gray-700"
                            }`}
                          >
                            {table.columns.length}
                          </span>
                        </div>
                      </div>

                      {table.selected && (
                        <div className="px-4 pb-4 animate-fadeIn">
                          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                            <div className="text-xs text-gray-500 mb-2 flex items-center space-x-1">
                              <span>Columnas:</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {table.columns.map((column, colIndex) => (
                                <div
                                  key={column}
                                  className="text-sm text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded flex items-center space-x-2 hover:bg-gray-700 transition-colors duration-200"
                                  style={{
                                    animationDelay: `${colIndex * 30}ms`,
                                  }}
                                >
                                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                                  <span>{column}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <div className="text-center space-y-4">
                  <Table className="w-20 h-20 mx-auto opacity-30" />
                  <div>
                    <p className="text-lg font-medium text-gray-400">
                      Sin tablas detectadas
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Las tablas aparecerán automáticamente después de generar
                      código SQL con CREATE TABLE
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "python" && (
          <div className="h-full">
            {generatingPython ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 p-8">
                <div className="text-center space-y-6">
                  <div className="relative">
                    <Code className="w-20 h-20 mx-auto text-green-400 animate-pulse" />
                    <div className="absolute -top-2 -right-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full animate-spin border-4 border-green-300 border-t-transparent"></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-medium text-green-400 mb-2">
                      🐍 Generando código Python...
                    </p>
                    <p className="text-sm text-gray-500">
                      Creando funciones para {selectedTablesCount} tabla
                      {selectedTablesCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex space-x-1 items-center justify-center">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : pythonCode ? (
              <div className="h-full flex flex-col">
                <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Code className="w-4 h-4 text-green-400" />
                    <h4 className="font-medium text-gray-300">
                      Código Python Generado
                    </h4>
                  </div>
                  <button
                    onClick={() => copyToClipboard(pythonCode, "python")}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center space-x-2 transition-colors duration-200 shadow-sm"
                  >
                    {copied === "python" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copied === "python" ? "Copiado!" : "Copiar"}</span>
                  </button>
                </div>
                <div className="flex-1 p-4 text-gray-300 overflow-auto bg-gray-900">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {highlightPython(pythonCode)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <div className="text-center space-y-4">
                  <Code className="w-20 h-20 mx-auto opacity-30" />
                  <div>
                    <p className="text-lg font-medium text-gray-400">
                      Sin código Python generado
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Selecciona las tablas que deseas incluir y presiona
                      "Generar Python"
                    </p>
                  </div>
                  {tables.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
                      <p className="text-sm text-blue-300">
                        💡 Tienes {tables.length} tabla
                        {tables.length !== 1 ? "s" : ""} disponible
                        {tables.length !== 1 ? "s" : ""}. Ve a la pestaña
                        "Tablas" para seleccionarlas.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBar = ({
  cursorPosition,
}: {
  cursorPosition: { lineNumber: number; column: number };
}) => {
  return (
    <div className="bg-blue-900 text-white px-4 py-2 text-sm flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <span>GutYisuSQL IDE</span>
        <span className="text-blue-200">v1.0.0</span>
      </div>
      <div className="flex items-center space-x-4">
        <span>
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </span>
        <span className="text-blue-200">GY</span> {/* Cambiar de SQL a GY */}
      </div>
    </div>
  );
};

export default IDE;

const styles = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
`;

// Inyectar los estilos
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
