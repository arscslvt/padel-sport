"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type SupportRequestValues,
  supportRequestSchema,
} from "@/lib/support-request";

/**
 * Sopra il verde i campi non possono usare `bg-background`: il bianco velato
 * è l'unico riempimento che regge sia il contrasto del testo sia il colore
 * della banda.
 */
const FIELD_CLASS =
  "h-11 rounded-xl border-white/20 bg-white/10 text-foreground placeholder:text-foreground/45";

export function SupportForm() {
  const form = useForm<SupportRequestValues>({
    resolver: zodResolver(supportRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      memberId: "",
      message: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/support-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Richiesta non inviata", {
          description:
            payload?.error ?? "Riprova fra poco o scrivici su WhatsApp.",
        });
        return;
      }

      toast.success("Richiesta inviata", {
        description: payload?.notified
          ? "Ti abbiamo mandato una copia via email. Ti rispondiamo il prima possibile."
          : "Ti rispondiamo il prima possibile.",
      });
      form.reset();
    } catch {
      toast.error("Richiesta non inviata", {
        description: "Controlla la connessione e riprova.",
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    placeholder="Es. Mario Rossi"
                    className={FIELD_CLASS}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Es. mario.rossi@email.com"
                    className={FIELD_CLASS}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Es. +39 333 1234567"
                    className={FIELD_CLASS}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Matricola socio{" "}
                  <span className="text-muted-foreground font-normal">
                    (facoltativa)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Es. PS-01429"
                    className={FIELD_CLASS}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Messaggio</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Dicci come possiamo aiutarti."
                  className="text-foreground placeholder:text-foreground/45 min-h-28 rounded-xl border-white/20 bg-white/10"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="pill"
          disabled={form.formState.isSubmitting}
          className="mt-2 w-full sm:w-fit"
        >
          {form.formState.isSubmitting ? "Invio in corso…" : "Invia richiesta"}
        </Button>
      </form>
    </Form>
  );
}
