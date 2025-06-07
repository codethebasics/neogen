import classNames from "classnames";
import {useRef} from "react";
import {toast} from "react-toastify";

function Preview({
  html,
  isResizing,
  isAiWorking,
  ref,
}: {
  html: string;
  isResizing: boolean;
  isAiWorking: boolean;
  setView: React.Dispatch<React.SetStateAction<"editor" | "preview">>;
  ref: React.RefObject<HTMLDivElement | null>;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  return (
    <div
      ref={ref}
      className="border-l border-gray-900 bg-white"
      style={{"height": "100%", "flex": 1}}
      onClick={(e) => {
        if (isAiWorking) {
          e.preventDefault();
          e.stopPropagation();
          toast.warn("Por favor, espere a IA terminar o trabalho.");
        }
      }}
    >
      <iframe
        ref={iframeRef}
        title="output"
        className={classNames("w-full h-full select-none", {
          "pointer-events-none": isResizing || isAiWorking,
        })}
        srcDoc={html}
      />
    </div>
  );
}

export default Preview;
