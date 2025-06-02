import {useRef, useState} from "react";
import Editor from "@monaco-editor/react";
import {editor} from "monaco-editor";
import {useEvent, useLocalStorage, useMount, useSearchParam, useUnmount,} from "react-use";
import {toast} from "react-toastify";
import {defaultHTML} from "./../../utils/consts";
import AskAI from "./ask-ai/ask-ai";
import {Auth} from "./../../utils/types";
import Preview from "./preview/preview";

function App() {

    const [htmlStorage, , removeHtmlStorage] = useLocalStorage("html_content");
    const remix = useSearchParam("remix");

    const preview = useRef<HTMLDivElement>(null);
    const editor = useRef<HTMLDivElement>(null);
    const resizer = useRef<HTMLDivElement>(null);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const [isResizing, setIsResizing] = useState(false);
    const [, setError] = useState(false);
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
                                    <i className="fas fa-robot text-lg text-white"></i>
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
                {/*<div*/}
                {/*    onClick={(e) => {*/}
                {/*      if (isAiWorking) {*/}
                {/*        e.preventDefault();*/}
                {/*        e.stopPropagation();*/}
                {/*        toast.warn("Please wait for the AI to finish working.");*/}
                {/*      }*/}
                {/*    }}*/}
                {/*    style={{"display": "none"}}*/}
                {/*>*/}
                {/*  <Editor*/}
                {/*      language="html"*/}
                {/*      theme="vs-dark"*/}
                {/*      value={html}*/}
                {/*      onValidate={(markers) => {*/}
                {/*        if (markers?.length > 0) {*/}
                {/*          setError(true);*/}
                {/*        }*/}
                {/*      }}*/}
                {/*      onChange={(value) => {*/}
                {/*        const newValue = value ?? "";*/}
                {/*        setHtml(newValue);*/}
                {/*        setError(false);*/}
                {/*      }}*/}
                {/*      onMount={(editor) => (editorRef.current = editor)}*/}
                {/*  />*/}
                {/*</div>*/}
                {/*<div style={{"height": "100%"}}>*/}
                {/*  <Preview*/}
                {/*      html={html}*/}
                {/*      isResizing={isResizing}*/}
                {/*      isAiWorking={isAiWorking}*/}
                {/*      ref={preview}*/}
                {/*      setView={setCurrentView}*/}
                {/*  />*/}
                {/*</div>*/}
                {/*<div>*/}
                {/*  <AskAI*/}
                {/*      html={html}*/}
                {/*      setHtml={setHtml}*/}
                {/*      isAiWorking={isAiWorking}*/}
                {/*      setisAiWorking={setisAiWorking}*/}
                {/*      setView={setCurrentView}*/}
                {/*      onNewPrompt={(prompt) => {*/}
                {/*        setPrompts((prev) => [...prev, prompt]);*/}
                {/*      }}*/}
                {/*      onScrollToBottom={() => {*/}
                {/*        editorRef.current?.revealLine(*/}
                {/*            editorRef.current?.getModel()?.getLineCount() ?? 0*/}
                {/*        );*/}
                {/*      }}*/}
                {/*  />*/}
                {/*</div>*/}
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
