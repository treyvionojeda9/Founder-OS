import { useEffect, useRef, useState } from "react";
import { copyText, deepPath, shareUrl, type DeepKind } from "./deepLink";

type CopyLinkProps = {
  kind: DeepKind;
  id: string;
};

/**
 * A paper-corner pin. One click copies the deep URL.
 * The pin fills in. There is no toast.
 */
export function CopyLink({ kind, id }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const onCopy = () => {
    void copyText(shareUrl(deepPath(kind, id))).then((ok) => {
      if (!ok) return;
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 4000);
    });
  };

  return (
    <button
      type="button"
      className="copy-link"
      data-kind={kind}
      data-id={id}
      data-copied={copied ? "true" : "false"}
      data-pattern={copied ? "tick" : "corner"}
      data-frames="1"
      data-lighting="ember"
      aria-label={copied ? "Link copied" : "Copy link"}
      onClick={(event) => {
        event.stopPropagation();
        onCopy();
      }}
    >
      <span className="copy-corner" aria-hidden="true" />
      <span className="copy-pin" aria-hidden="true" />
    </button>
  );
}
