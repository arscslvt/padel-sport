"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { type ClipboardEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { prepareImage } from "@/lib/image-resize";

import type { Reward } from "./types";

/**
 * Crea o corregge un premio.
 *
 * La foto si carica in due tempi: prima il file va dritto a Convex con un
 * indirizzo usa-e-getta, poi il premio si salva con l'id che Convex ha
 * restituito. Così l'immagine non passa dalle funzioni del sito, che hanno un
 * limite sul corpo della richiesta.
 */

/**
 * Il file di partenza può essere grande: uno scatto del telefono pesa anche
 * dieci mega. Tanto viene ridotto a 600px e ricodificato in WebP prima di
 * partire (lib/image-resize.ts); il tetto serve solo a non far elaborare al
 * browser qualcosa di assurdo.
 */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** Il lato massimo della foto salvata: la card del premio non ne mostra di più. */
const MAX_IMAGE_SIZE = 600;

/** "42 KB", "1,2 MB": il peso finale, per far vedere che la conversione è servita. */
function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB`;
}

async function uploadImage(file: File): Promise<string> {
  const response = await fetch("/api/dashboard/points/rewards/upload-url", {
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? "Caricamento non disponibile.");
  }

  const upload = await fetch(payload.url, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!upload.ok) throw new Error("La foto non è stata caricata.");

  const { storageId } = await upload.json();
  return storageId;
}

export function RewardDialog({
  open,
  reward,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** Assente per un premio nuovo. */
  reward: Reward | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [terms, setTerms] = useState("");
  const [validityDays, setValidityDays] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  /** La foto scelta è in conversione: niente salvataggio finché non è pronta. */
  const [processing, setProcessing] = useState(false);
  const [imageInfo, setImageInfo] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setTitle(reward?.title ?? "");
    setDescription(reward?.description ?? "");
    setCost(reward ? String(reward.cost) : "");
    setTerms(reward?.terms ?? "");
    setValidityDays(reward?.validityDays ? String(reward.validityDays) : "");
    setFile(null);
    setImageInfo(null);
    setPreview(reward?.imageUrl ?? null);
    setRemoveImage(false);
  }, [open, reward]);

  // L'anteprima di un file locale è un URL da liberare, o resta in memoria.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = async (picked: File | undefined) => {
    if (!picked) return;

    // Alcuni browser non danno un tipo agli HEIC del telefono: li lasciamo
    // provare, e se non si aprono lo dice `prepareImage`.
    const looksLikeImage =
      picked.type.startsWith("image/") || /\.(heic|heif)$/i.test(picked.name);

    if (!looksLikeImage) {
      toast.error("Serve un'immagine: JPG, PNG, WebP, HEIC o simili.");
      return;
    }
    if (picked.size > MAX_SOURCE_BYTES) {
      toast.error("La foto supera i 25 MB: scegline una più leggera.");
      return;
    }

    setProcessing(true);
    try {
      const prepared = await prepareImage(picked, MAX_IMAGE_SIZE);

      setFile(prepared.file);
      setImageInfo(
        `${prepared.width}×${prepared.height} · ${
          prepared.file.type === "image/webp" ? "WebP" : "JPEG"
        } · ${formatBytes(prepared.file.size)}`,
      );
      setRemoveImage(false);
    } catch (error) {
      toast.error("Foto non utilizzabile", {
        description:
          error instanceof Error ? error.message : "Prova con un'altra foto.",
      });
    } finally {
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  /**
   * Un'immagine incollata dagli appunti: uno screenshot, o una foto copiata da
   * un sito o da WhatsApp Web. Si ascolta su tutto il modulo e non solo sul
   * riquadro della foto, perché chi incolla non sa di dover cliccare prima lì.
   * Il testo incollato nei campi passa indisturbato: si intercetta solo quando
   * negli appunti c'è davvero un'immagine.
   */
  const pasteImage = (event: ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();

    if (!image) return;

    event.preventDefault();
    void pickFile(image);
  };

  const clearImage = () => {
    setFile(null);
    setImageInfo(null);
    setPreview(null);
    setRemoveImage(Boolean(reward?.hasImage));
    if (fileInput.current) fileInput.current.value = "";
  };

  const save = async () => {
    const costValue = Number(cost);
    const daysValue = validityDays ? Number(validityDays) : undefined;

    if (title.trim().length < 2 || description.trim().length < 2) {
      toast.error("Servono un titolo e una descrizione.");
      return;
    }
    if (!Number.isInteger(costValue) || costValue < 1) {
      toast.error("Il costo è un numero intero di punti, almeno uno.");
      return;
    }
    if (
      daysValue !== undefined &&
      (!Number.isInteger(daysValue) || daysValue < 1)
    ) {
      toast.error("La validità è un numero di giorni, almeno uno.");
      return;
    }

    setSaving(true);

    try {
      const imageStorageId = file ? await uploadImage(file) : undefined;

      const response = await fetch("/api/dashboard/points/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: reward?.id,
          title: title.trim(),
          description: description.trim(),
          cost: costValue,
          terms: terms.trim() || undefined,
          validityDays: daysValue,
          imageStorageId,
          removeImage: removeImage && !imageStorageId ? true : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Premio non salvato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success(reward ? "Premio aggiornato" : "Premio pubblicato", {
        description: "È già visibile nell'area personale dei clienti.",
      });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error("Premio non salvato", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        onPaste={pasteImage}
      >
        <DialogHeader>
          <DialogTitle>
            {reward ? "Modifica premio" : "Nuovo premio"}
          </DialogTitle>
          <DialogDescription>
            Si sblocca quando il cliente raggiunge il costo in punti, e lo
            riscatta dalla sua area personale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Foto</Label>
            {preview ? (
              <div className="relative overflow-hidden rounded-lg border">
                {/* biome-ignore lint/performance/noImgElement: anteprima locale o URL firmato di Convex, che next/image non conosce. */}
                <img
                  src={preview}
                  alt="Anteprima del premio"
                  className="aspect-[4/3] w-full object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 size-8"
                  aria-label="Togli la foto"
                  onClick={clearImage}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={processing}
                className="text-muted-foreground hover:bg-muted/40 flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm transition-colors"
              >
                {processing ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <ImagePlus className="size-6" />
                )}
                {processing
                  ? "Preparo la foto…"
                  : "Carica una foto o incollala (⌘V / Ctrl+V)"}
                <span className="text-xs">
                  Qualsiasi formato: la riduciamo a 600px e la salviamo in WebP
                </span>
              </button>
            )}
            {preview && (
              <p className="text-muted-foreground text-xs">
                {imageInfo ? `${imageInfo}. ` : ""}Per sostituirla, incolla
                un'altra immagine o toglila con la X.
              </p>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={(event) => void pickFile(event.target.files?.[0])}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reward-title">Titolo</Label>
            <Input
              id="reward-title"
              value={title}
              placeholder="Es. Un'ora di campo gratis"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reward-description">Descrizione</Label>
            <Textarea
              id="reward-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reward-cost">Costo in punti</Label>
              <Input
                id="reward-cost"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={cost}
                onChange={(event) => setCost(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reward-validity">Validità dal riscatto</Label>
              <Input
                id="reward-validity"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="Giorni, facoltativo"
                value={validityDays}
                onChange={(event) => setValidityDays(event.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Senza validità il premio riscattato non scade.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="reward-terms">Termini di utilizzo</Label>
            <Textarea
              id="reward-terms"
              rows={3}
              placeholder="Facoltativo. Es. valido dal lunedì al venerdì, non cumulabile."
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={() => void save()} disabled={saving || processing}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {reward ? "Salva" : "Pubblica premio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
