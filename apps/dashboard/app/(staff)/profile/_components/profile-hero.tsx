"use client";

import { useUser } from "@clerk/nextjs";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { useConfirm } from "@/app/_providers/confirm.provider";
import { Badge } from "@/components/ui/badge";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Il lato della foto che carichiamo: il doppio dell'avatar più grande. */
const AVATAR_SIDE = 512;

/**
 * Ritaglia il centro della foto in un quadrato, prima di mandarla a Clerk.
 *
 * Clerk tiene la foto così com'è, e ovunque la si mostri in un cerchio (qui,
 * sul sito, nell'app) una foto verticale finiva schiacciata o tagliata a
 * caso. Ritagliata qui, è la stessa dappertutto, e pesa un decimo di uno
 * scatto del telefono. Se il browser non sa leggerla, parte l'originale.
 */
async function squareCrop(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const target = Math.min(AVATAR_SIDE, side);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      target,
      target,
    );
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/**
 * Chi sei: la foto, il nome, l'email con cui entri e il ruolo nello staff.
 *
 * La foto si cambia toccandola, come nei contatti del telefono, o dal tasto
 * sotto; si toglie solo dal tasto, con una conferma. Mentre carica, la foto
 * vecchia resta al suo posto velata, e la nuova la sostituisce in
 * dissolvenza: si vede che è cambiata, senza un buco nel mezzo.
 *
 * Da telefono la testata è centrata, come il proprio account nelle
 * Impostazioni di iOS; da desktop diventa una riga dentro una superficie.
 */
export function ProfileHero({ role }: { role: string }) {
  const { user } = useUser();
  const confirm = useConfirm();
  const reduce = useReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  if (!user) return null;

  const name = user.fullName?.trim() || "Senza nome";
  const email = user.primaryEmailAddress?.emailAddress;

  const pick = () => {
    if (!busy) input.current?.click();
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Svuotato subito: scegliere di nuovo la stessa foto deve ripartire.
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Foto non caricata", {
        description: "Il file scelto non è un'immagine.",
      });
      return;
    }

    setBusy("upload");
    try {
      await user.setProfileImage({ file: await squareCrop(file) });
      await user.reload();
      toast.success("Foto aggiornata");
    } catch {
      toast.error("Foto non caricata", {
        description: "Riprova tra poco, o con un'altra immagine.",
      });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Togliere la foto?",
      description: "Al suo posto tornerà l'immagine predefinita.",
      confirmLabel: "Togli la foto",
      tone: "destructive",
      desktop: "toast",
    });
    if (!ok) return;

    setBusy("remove");
    try {
      await user.setProfileImage({ file: null });
      await user.reload();
    } catch {
      toast.error("Foto non rimossa", { description: "Riprova tra poco." });
    } finally {
      setBusy(null);
    }
  };

  const action =
    "bg-muted/70 active:bg-muted md:hover:bg-muted inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-[background-color,transform,opacity] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

  return (
    <header className="flex flex-col items-center gap-4 text-center md:flex-row md:gap-5 md:rounded-2xl md:border md:bg-card md:p-6 md:text-left">
      <button
        type="button"
        onClick={pick}
        disabled={busy !== null}
        aria-label="Cambia la foto del profilo"
        className="group focus-visible:ring-ring/50 relative size-24 shrink-0 rounded-full outline-none focus-visible:ring-[3px] md:size-20"
      >
        <span className="bg-muted ring-border block size-full overflow-hidden rounded-full ring-1">
          <AnimatePresence initial={false} mode="popLayout">
            {/* biome-ignore lint/performance/noImgElement: la foto la serve Clerk già ritagliata a 512px, e la dissolvenza vuole un elemento di Motion. */}
            <motion.img
              key={user.imageUrl}
              src={user.imageUrl}
              alt=""
              className="size-full object-cover"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
              animate={{ opacity: busy ? 0.45 : 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            />
          </AnimatePresence>
        </span>

        {busy && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-foreground size-6 animate-spin" />
          </span>
        )}

        {/* Il segno che la foto si tocca: piccolo, sul bordo, come in iOS. */}
        <span
          aria-hidden
          className="bg-foreground text-background border-background absolute -right-0.5 -bottom-0.5 flex size-8 items-center justify-center rounded-full border-[3px] transition-transform duration-200 group-active:scale-90 md:size-7 md:group-hover:scale-110"
        >
          <Camera className="size-3.5" />
        </span>
      </button>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={upload}
      />

      <div className="min-w-0 md:flex-1">
        <h2 className="truncate text-2xl leading-tight font-semibold tracking-[-0.02em]">
          {name}
        </h2>
        {email && (
          <p className="text-muted-foreground mt-1 truncate text-[15px] md:text-sm">
            {email}
          </p>
        )}
        <Badge variant="secondary" className="mt-2.5">
          {role}
        </Badge>
      </div>

      <div className="flex gap-2 md:flex-col md:items-stretch">
        <button
          type="button"
          onClick={pick}
          disabled={busy !== null}
          className={action}
        >
          <Camera className="size-4" />
          {user.hasImage ? "Cambia foto" : "Aggiungi foto"}
        </button>
        {user.hasImage && (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy !== null}
            className={cn(action, "text-danger")}
          >
            <Trash2 className="size-4" />
            Togli
          </button>
        )}
      </div>
    </header>
  );
}
