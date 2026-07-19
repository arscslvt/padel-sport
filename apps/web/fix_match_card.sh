sed -i '' -e 's/import { Calendar, ClockFading, Play, Trophy } from "lucide-react";/import { ClockFading, Play, Trophy } from "lucide-react";/' \
    -e '/import LiveDot from "..\/live-dot";/d' \
    -e '/import { Badge } from "@\/components\/ui\/badge";/d' \
    -e '/const STATUS_DISPLAY = {/,/};/d' \
    /Users/salvatore/Development/Web/padelsport/app/tournament/components/groups/match.card.tsx
