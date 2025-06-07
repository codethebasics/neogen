import {useRef, useState} from "react";
import {editor} from "monaco-editor";
import {useEvent, useLocalStorage, useMount, useSearchParam, useUnmount,} from "react-use";
import {toast} from "react-toastify";
import {defaultHTML} from "./../../utils/consts";
import AskAI from "./ask-ai/ask-ai";
import {Auth} from "./../../utils/types";
import Preview from "./preview/preview";
import logo from "../assets/zeyra-icon.svg";

function App() {

    const [htmlStorage, , removeHtmlStorage] = useLocalStorage("html_content");
    const remix = useSearchParam("remix");

    const preview = useRef<HTMLDivElement>(null);
    const editor = useRef<HTMLDivElement>(null);
    const resizer = useRef<HTMLDivElement>(null);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const [isResizing, setIsResizing] = useState(false);
    // const [, setError] = useState(false);
    const [html, setHtml] = useState((htmlStorage as string) ?? defaultHTML);
    const [isAiWorking, setisAiWorking] = useState(false);
    const [, setAuth] = useState<Auth | undefined>(undefined);
    const [, setCurrentView] = useState<"editor" | "preview">(
        "editor"
    );
    const [, setPrompts] = useState<string[]>([]);

    const fetchMe = async () => {
        const res = await fetch("/api/me");
        if (res.ok) {
            const data = await res.json();
            setAuth(data);
        } else {
            setAuth(undefined);
        }
    };

    const fetchRemix = async () => {
        if (!remix) return;
        const res = await fetch(`/api/remix/${remix}`);
        if (res.ok) {
            const data = await res.json();
            if (data.html) {
                setHtml(data.html);
                toast.success("Remix content loaded successfully.");
            }
        } else {
            toast.error("Failed to load remix content.");
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("remix");
        window.history.replaceState({}, document.title, url.toString());
    };

    /**
     * Resets the layout based on screen size
     * - For desktop: Sets editor to 1/3 width and preview to 2/3
     * - For mobile: Removes inline styles to let CSS handle it
     */
    const resetLayout = () => {
        if (!editor.current || !preview.current) return;

        // lg breakpoint is 1024px based on useBreakpoint definition and Tailwind defaults
        if (window.innerWidth >= 1024) {
            // Set initial 1/3 - 2/3 sizes for large screens, accounting for resizer width
            const resizerWidth = resizer.current?.offsetWidth ?? 8; // w-2 = 0.5rem = 8px
            const availableWidth = window.innerWidth - resizerWidth;
            const initialEditorWidth = availableWidth / 3; // Editor takes 1/3 of space
            const initialPreviewWidth = availableWidth - initialEditorWidth; // Preview takes 2/3
            editor.current.style.width = `${initialEditorWidth}px`;
            preview.current.style.width = `${initialPreviewWidth}px`;
        } else {
            // Remove inline styles for smaller screens, let CSS flex-col handle it
            editor.current.style.width = "";
            preview.current.style.width = "";
        }
    };

    /**
     * Handles resizing when the user drags the resizer
     * Ensures minimum widths are maintained for both panels
     */
    const handleResize = (e: MouseEvent) => {
        if (!editor.current || !preview.current || !resizer.current) return;

        const resizerWidth = resizer.current.offsetWidth;
        const minWidth = 100; // Minimum width for editor/preview
        const maxWidth = window.innerWidth - resizerWidth - minWidth;

        const editorWidth = e.clientX;
        const clampedEditorWidth = Math.max(
            minWidth,
            Math.min(editorWidth, maxWidth)
        );
        const calculatedPreviewWidth =
            window.innerWidth - clampedEditorWidth - resizerWidth;

        editor.current.style.width = `${clampedEditorWidth}px`;
        preview.current.style.width = `${calculatedPreviewWidth}px`;
    };

    const handleMouseDown = () => {
        setIsResizing(true);
        document.addEventListener("mousemove", handleResize);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleResize);
        document.removeEventListener("mouseup", handleMouseUp);
    };

    // Prevent accidental navigation away when AI is working or content has changed
    useEvent("beforeunload", (e) => {
        if (isAiWorking || html !== defaultHTML) {
            e.preventDefault();
            return "";
        }
    });

    // Initialize component on mount
    useMount(() => {
        // Fetch user data
        fetchMe();
        fetchRemix();

        // Restore content from storage if available
        if (htmlStorage) {
            removeHtmlStorage();
            toast.warn("Previous HTML content restored from local storage.");
        }

        // Set initial layout based on window size
        resetLayout();

        // Attach event listeners
        if (!resizer.current) return;
        resizer.current.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("resize", resetLayout);
    });

    // Clean up event listeners on unmount
    useUnmount(() => {
        document.removeEventListener("mousemove", handleResize);
        document.removeEventListener("mouseup", handleMouseUp);
        if (resizer.current) {
            resizer.current.removeEventListener("mousedown", handleMouseDown);
        }
        window.removeEventListener("resize", resetLayout);
    });

    return (
        <div id="app-wrapper" className="app-container">
            {/* ====== */}
            {/* Header */}
            {/* ====== */}
            <div id="app-header">
                <header className="py-4 px-6 border-b border-gray-800">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div
                                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-effect">
                                    <div>
                                        <img src={logo} alt={"Logo"} style={{"objectFit": "contain"}} />
                                    </div>
                                </div>
                                <div
                                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full pulse-animation"></div>
                            </div>
                            <h1 className="text-2xl font-bold font-futuristic">
                                <span className="gradient-text">NEO</span> <span className="text-white">DESIGN</span>
                            </h1>
                            <div className="text-sm text-gray-400 font-mono hidden md:block">v3.2.1</div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="hidden md:flex items-center space-x-2 text-gray-400">
                                <div className="status-indicator status-active"></div>
                                <span>Conectado</span>
                            </div>
                            <button
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center neon-btn">
                                <i className="fas fa-user-astronaut mr-2"></i>
                                <span className="hidden md:inline">Usuário</span>
                            </button>
                            <button className="p-2 text-gray-400 hover:text-primary">
                                <i className="fas fa-cog"></i>
                            </button>
                        </div>
                    </div>
                </header>
            </div>
            {/* ======= */}
            {/* Sidebar */}
            {/* ======= */}
            <div id="app-sidebar">
                <aside className="w-16 md:w-64 bg-gray-900/50 border-r border-gray-800 flex flex-col">
                    <nav className="flex-1 p-2 space-y-1">
                        <button className="w-full flex items-center p-3 rounded-lg bg-primary/10 text-primary">
                            <i className="fas fa-magic text-lg w-8"></i>
                            <span className="ml-2 hidden md:inline">Gerador</span>
                        </button>
                        <button
                            className="w-full flex items-center p-3 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-800/50">
                            <i className="fas fa-folder text-lg w-8"></i>
                            <span className="ml-2 hidden md:inline">Projetos</span>
                        </button>
                        <button
                            className="w-full flex items-center p-3 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-800/50">
                            <i className="fas fa-palette text-lg w-8"></i>
                            <span className="ml-2 hidden md:inline">Temas</span>
                        </button>
                        <button
                            className="w-full flex items-center p-3 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-800/50">
                            <i className="fas fa-cube text-lg w-8"></i>
                            <span className="ml-2 hidden md:inline">Componentes</span>
                        </button>
                        <button
                            className="w-full flex items-center p-3 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-800/50">
                            <i className="fas fa-database text-lg w-8"></i>
                            <span className="ml-2 hidden md:inline">Assets</span>
                        </button>
                    </nav>

                    <div className="p-4 border-t border-gray-800">
                        <div className="hidden md:block text-xs text-gray-500 mb-2">SISTEMA</div>
                        <button
                            className="w-full flex items-center p-3 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-800/50">
                            <i className="fas fa-terminal text-lg w-8"></i>
                            <span className="ml-2 hidden md:inline">Console</span>
                        </button>
                        <button
                            className="w-full flex items-center p-3 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-800/50">
                            <i className="fas fa-question-circle text-lg w-8"></i>
                            <span className="ml-2 hidden md:inline">Ajuda</span>
                        </button>
                    </div>
                </aside>
            </div>
            {/* ==== */}
            {/* Body */}
            {/* ==== */}
            <div id="app-body" className="main-content p-6 grid-pattern">
                {/* Main Content Area */}
                <div className="main-content p-6 grid-pattern">
                    {/* =============== */}
                    {/* Generator Panel */}
                    {/* =============== */}
                    <div>
                        <div id="status-message" className="status-message"></div>

                        {/* ==== */}
                        {/* Tabs */}
                        {/* ==== */}
                        <div className="cyber-panel rounded-xl overflow-hidden mb-6">
                            <div className="flex border-b border-gray-800">
                                {/* Configurações */}
                                <div className="cyber-tab active px-6 py-3 rounded-tl-lg">
                                    <i className="fas fa-sliders-h mr-2"></i>
                                    <span className="hidden md:inline">Configurações</span>
                                </div>
                                {/* Código */}
                                <div className="cyber-tab px-6 py-3">
                                    <i className="fas fa-code mr-2"></i>
                                    <span className="hidden md:inline">Código</span>
                                </div>
                                {/* Otimização */}
                                <div className="cyber-tab px-6 py-3 rounded-tr-lg">
                                    <i className="fas fa-chart-line mr-2"></i>
                                    <span className="hidden md:inline">Otimização</span>
                                </div>
                            </div>

                            <div className="p-6 flex gap-4">
                                {/* ============= */}
                                {/* Estilo visual */}
                                {/* ============= */}
                                <div className="flex">
                                    <div className="cyber-glass rounded-xl p-4 h-fit">
                                        <h3 className="text-lg font-bold font-futuristic mb-4 flex items-center">
                                            <i className="fas fa-paint-brush mr-2 text-primary"></i>
                                            Estilo Visual
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-gray-400 mb-2">Tema</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <label className="cursor-pointer">
                                                        <input type="radio" name="theme" value="futuristic"
                                                               className="cyber-radio hidden" />
                                                            <div
                                                                className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg border border-transparent hover:border-primary transition text-center">
                                                                <i className="fas fa-robot text-xl mb-1 text-primary"></i>
                                                                <div className="text-xs">Futurista</div>
                                                            </div>
                                                    </label>
                                                    <label className="cursor-pointer">
                                                        <input type="radio" name="theme" value="modern"
                                                               className="cyber-radio hidden" />
                                                            <div
                                                                className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg border border-transparent hover:border-primary transition text-center">
                                                                <i className="fas fa-star text-xl mb-1 text-yellow-400"></i>
                                                                <div className="text-xs">Moderno</div>
                                                            </div>
                                                    </label>
                                                    <label className="cursor-pointer">
                                                        <input type="radio" name="theme" value="minimal"
                                                               className="cyber-radio hidden" />
                                                            <div
                                                                className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg border border-transparent hover:border-primary transition text-center">
                                                                <i className="fas fa-minimize text-xl mb-1 text-white"></i>
                                                                <div className="text-xs">Minimalista</div>
                                                            </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Cores</label>
                                            <div className="space-y-3">
                                                <div className="color-picker-container">
                                                    <label className="color-picker-label">Primária</label>
                                                    <div id="color-picker-primary" className="w-full"></div>
                                                </div>
                                                <div className="color-picker-container">
                                                    <label className="color-picker-label">Secundária</label>
                                                    <div id="color-picker-secondary" className="w-full"></div>
                                                </div>
                                                <div className="color-picker-container">
                                                    <label className="color-picker-label">Destaque</label>
                                                    <div id="color-picker-accent" className="w-full"></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Efeitos</label>
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-3 cursor-pointer">
                                                    <input type="checkbox" className="cyber-checkbox" />
                                                        <span className="flex-1 text-sm">Partículas</span>
                                                </label>
                                                <label className="flex items-center space-x-3 cursor-pointer">
                                                    <input type="checkbox" className="cyber-checkbox" />
                                                        <span className="flex-1 text-sm">Holográfico</span>
                                                </label>
                                                <label className="flex items-center space-x-3 cursor-pointer">
                                                    <input type="checkbox" className="cyber-checkbox" />
                                                        <span className="flex-1 text-sm">3D</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ================== */}
                                {/* Comando de geração */}
                                {/* ================== */}
                                <div className="lg:col-span-2 space-y-4 flex-1">
                                    <div className="cyber-glass rounded-xl p-4">
                                        <h3 className="text-lg font-bold font-futuristic mb-3 flex items-center">
                                            <i className="fas fa-terminal mr-2 text-accent"></i>
                                            Comando de Geração
                                        </h3>

                                        {/*<textarea id="command-input" rows={5}*/}
                                        {/*          placeholder="Descreva o site que deseja criar... Exemplo: Landing page futurista para app de realidade aumentada com cores roxo e azul, animações 3D e formulário de contato..."*/}
                                        {/*          className="w-full px-4 py-3 cyber-input rounded-lg bg-gray-900 focus:ring-2 focus:ring-primary outline-none transition"></textarea>*/}

                                        <AskAI
                                            html={html}
                                            setHtml={setHtml}
                                            isAiWorking={isAiWorking}
                                            setisAiWorking={setisAiWorking}
                                            setView={setCurrentView}
                                            onNewPrompt={(prompt) => {
                                                setPrompts((prev) => [...prev, prompt]);
                                            }}
                                            onScrollToBottom={() => {
                                                editorRef.current?.revealLine(
                                                    editorRef.current?.getModel()?.getLineCount() ?? 0
                                                );
                                            }}
                                        />

                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-xs text-gray-400">
                                                <i className="fas fa-info-circle mr-1"></i> Seja detalhado para melhores
                                                resultados
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button id="optimize-btn"
                                                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition flex items-center neon-btn">
                                            <i className="fas fa-magic mr-2"></i> Otimizar
                                        </button>
                                        <button id="clear-btn"
                                                className="px-4 py-3 bg-transparent border border-gray-700 text-gray-300 hover:text-white rounded-lg font-medium transition flex items-center neon-btn">
                                            <i className="fas fa-trash-alt mr-2"></i> Limpar
                                        </button>
                                        <button id="save-btn"
                                                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition flex items-center neon-btn ml-auto">
                                            <i className="fas fa-save mr-2"></i> Salvar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ============= */}
                    {/* Preview panel */}
                    {/* ============= */}
                    <div className="cyber-panel rounded-xl overflow-hidden" id="preview">
                        <div className="flex justify-between items-center p-4 border-b border-gray-800">
                            <h3 className="text-lg font-bold font-futuristic flex items-center">
                                <i className="fas fa-eye mr-2 text-accent"></i>
                                Pré-visualização
                            </h3>
                            <div className="flex space-x-2">
                                <button id="download-btn"
                                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition flex items-center neon-btn">
                                    <i className="fas fa-download mr-1.5"></i>
                                    <span className="hidden md:inline">Baixar</span>
                                </button>
                                <button id="copy-btn"
                                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition flex items-center neon-btn">
                                    <i className="fas fa-copy mr-1.5"></i>
                                    <span className="hidden md:inline">Copiar</span>
                                </button>
                                <button id="code-btn"
                                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition flex items-center neon-btn">
                                    <i className="fas fa-code mr-1.5"></i>
                                    <span className="hidden md:inline">Código</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="preview-container bg-gray-900 rounded-xl overflow-hidden h-96 relative"
                                 id="preview-container">
                                <div className="flex h-full text-gray-500" id="empty-preview">
                                    <Preview
                                        html={html}
                                        isResizing={isResizing}
                                        isAiWorking={isAiWorking}
                                        ref={preview}
                                        setView={setCurrentView}
                                    />
                                    {/*<div className="text-center">*/}
                                    {/*    <i className="fas fa-file-code text-5xl mb-4"></i>*/}
                                    {/*    <h4 className="text-xl font-medium mb-2">Seu site será gerado aqui</h4>*/}
                                    {/*    <p className="text-sm">Descreva seu site acima e clique em "Gerar Site"</p>*/}
                                    {/*</div>*/}
                                </div>

                                {/* Loading state */}
                                <div id="loading-preview"
                                     className="hidden absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="spinner mx-auto mb-4"></div>
                                        <p className="text-primary font-medium">Gerando seu site futurista...</p>
                                    </div>
                                </div>

                                {/* Generated code */}
                                <div id="generated-content" className="hidden h-full" style={{"overflow": "auto"}}></div>
                            </div>
                        </div>
                    </div>

                    {/* Edit layout controls */}
                    <div id="edit-controls" className="edit-controls active">
                        <h3 className="text-lg font-bold font-futuristic mb-3 flex items-center">
                            <i className="fas fa-edit mr-2 text-accent"></i>
                            Editar Layout
                        </h3>
                        <div className="edit-controls-buttons">
                            <button id="edit-layout-btn"
                                    className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-medium hover:opacity-90 transition flex items-center neon-btn glow-effect">
                                <i className="fas fa-edit mr-2"></i> Editar Layout
                            </button>
                            <button id="save-layout-btn"
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition flex items-center neon-btn hidden">
                                <i className="fas fa-save mr-2"></i> Salvar Layout
                            </button>
                            <button id="download-html-btn"
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition flex items-center neon-btn">
                                <i className="fas fa-download mr-2"></i> Baixar HTML Atualizado
                            </button>
                        </div>
                        <div id="edit-instructions" className="text-sm text-gray-400 mt-3 hidden">
                            <i className="fas fa-info-circle mr-1"></i> Modo de edição ativado. Clique em qualquer elemento para
                            editá-lo diretamente.
                        </div>
                    </div>
                </div>
            </div>
            {/* ====== */}
            {/* Footer */}
            {/* ====== */}
            <div id="app-footer">
                footer
            </div>
        </div>
    );
}

export default App;
