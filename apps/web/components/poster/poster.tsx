import {
  POSTER_LIMITS,
  type PosterSpec,
  type SocialFormat,
} from "@padel-sport/backend/convex/modules/social/lib";
import { PosterBackground } from "@/components/poster/background";
import {
  DISPLAY_FAMILY,
  FEED_SIZE,
  SANS_FAMILY,
  STORY_SAFE_BOTTOM,
  STORY_SAFE_TOP,
  STORY_SIZE,
  scale,
  treatment,
} from "@/lib/poster/theme";

/**
 * La locandina, nei due formati che Instagram accetta.
 *
 * Feed e storia condividono struttura e differiscono per parametri — misure,
 * scala tipografica, aree di sicurezza — quindi sono una tela sola con due
 * involucri, non due file quasi identici che si allontanano al primo ritocco.
 *
 * Regole del mezzo, tutte imposte da satori e nessuna negoziabile:
 * ogni riquadro con più di un figlio dichiara `display: flex`; niente `grid`;
 * le distanze si fanno con i margini e non con `gap`; le misure sono in pixel
 * espliciti. Il testo viene troncato in JavaScript **prima** di arrivare qui,
 * perché satori non manda a capo con grazia e una riga di troppo non trabocca:
 * sposta tutto il resto fuori dalla tela.
 */

/** Taglia una stringa alla misura del suo slot, con i puntini se serve. */
function clamp(value: string, max: number): string {
  const clean = value.trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function Poster({
  spec,
  format,
  backgroundUrl,
}: {
  spec: PosterSpec;
  format: SocialFormat;
  backgroundUrl?: string;
}) {
  const size = format === "story" ? STORY_SIZE : FEED_SIZE;
  const type = scale[format];
  const skin = treatment[spec.accent];

  const bullets = (spec.bullets ?? [])
    .slice(0, POSTER_LIMITS.bullets)
    .map((bullet) => clamp(bullet, POSTER_LIMITS.bullet));

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: size.width,
        height: size.height,
        fontFamily: SANS_FAMILY,
        // Se il fondo restasse trasparente, satori produrrebbe un PNG con il
        // canale alfa e Instagram lo appiattirebbe sul nero a modo suo.
        backgroundColor: skin.background,
      }}
    >
      <PosterBackground
        accent={spec.accent}
        width={size.width}
        height={size.height}
        backgroundUrl={backgroundUrl}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          // Tre zone distanziate su tutta l'altezza: sopratitolo in alto,
          // titolo al centro, chiusa in fondo. Ancorare tutto in basso — la
          // prima cosa che viene in mente — lascia metà tela vuota, e su fondo
          // chiaro non sembra una scelta: sembra un errore di impaginazione.
          justifyContent: "space-between",
          height: size.height,
          paddingLeft: type.padding,
          paddingRight: type.padding,
          paddingTop: format === "story" ? STORY_SAFE_TOP : type.padding,
          paddingBottom: format === "story" ? STORY_SAFE_BOTTOM : type.padding,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: type.eyebrow,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: skin.muted,
              marginBottom: 28,
            }}
          >
            {clamp(spec.eyebrow, POSTER_LIMITS.eyebrow)}
          </div>

          <div
            style={{
              display: "flex",
              width: 96,
              height: 3,
              backgroundColor: skin.rule,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: DISPLAY_FAMILY,
              fontSize: type.headline,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: skin.foreground,
            }}
          >
            {clamp(spec.headline, POSTER_LIMITS.headline)}
          </div>

          {spec.subhead ? (
            <div
              style={{
                display: "flex",
                fontSize: type.subhead,
                lineHeight: 1.35,
                color: skin.muted,
                marginTop: 28,
              }}
            >
              {clamp(spec.subhead, POSTER_LIMITS.subhead)}
            </div>
          ) : null}

          {bullets.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 40,
              }}
            >
              {bullets.map((bullet) => (
                <div
                  key={bullet}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: type.bullet,
                    color: skin.foreground,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 22,
                      height: 2,
                      backgroundColor: skin.rule,
                      marginRight: 22,
                    }}
                  />
                  {bullet}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {spec.footer ? (
          <div
            style={{
              display: "flex",
              fontSize: type.footer,
              letterSpacing: "0.04em",
              color: skin.muted,
            }}
          >
            {clamp(spec.footer, POSTER_LIMITS.footer)}
          </div>
        ) : (
          // Un riquadro vuoto e non `null`: con due soli figli `space-between`
          // spinge il titolo in fondo invece di tenerlo al centro.
          <div style={{ display: "flex" }} />
        )}
      </div>
    </div>
  );
}

/** Storia 9:16, con le aree che Instagram si tiene per sé già scontate. */
export function StoryPoster(props: {
  spec: PosterSpec;
  backgroundUrl?: string;
}) {
  return <Poster {...props} format="story" />;
}

/** Post 4:5, il più alto che il feed accetta senza ritagliare. */
export function FeedPoster(props: {
  spec: PosterSpec;
  backgroundUrl?: string;
}) {
  return <Poster {...props} format="feed" />;
}
