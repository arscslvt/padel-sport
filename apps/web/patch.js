const fs = require('fs');
const file = 'app/tournament/[tournamentId]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace store variables mapping
content = content.replace(
  /const teamsDrawerOpen = useTournamentStore\(\(state\) => state\.teamsDrawerOpen\);/,
  `const teamsDrawerOpen = useTournamentStore((state) => state.teamsDrawerOpen);
  const searchPlayer = useTournamentStore((state) => state.searchPlayer);
  const setSearchPlayer = useTournamentStore((state) => state.setSearchPlayer);`
);

// add PlayerSearchDrawer import
content = content.replace(
  /import TeamsListDrawer from "\.\.\/components\/teams\/teams-list\.drawer";/,
  `import TeamsListDrawer from "../components/teams/teams-list.drawer";\nimport PlayerSearchDrawer from "../components/matches/player-search.drawer";`
);

// update TabsList with Search Button
content = content.replace(
  /<div className="bg-muted relative overflow-x-auto">\s*<TabsList className="bg-transparent w-max px-1 h-11 \[&_data-\[state=active\]\]:sticky \[&_data-\[state=active\]\]:left-0">\s*\{categories\?\.map\(\(category\) => \([\s\S]*?\{category\.name\}\s*<\/TabsTrigger>\s*\)\)\}\s*<\/TabsList>\s*<\/div>/,
  `<div className="bg-muted relative overflow-x-auto">
            <TabsList className="bg-transparent w-full justify-start px-1 h-11 [&_data-[state=active]]:sticky [&_data-[state=active]]:left-0">
              {categories?.map((category) => (
                <TabsTrigger
                  key={category.slug}
                  value={category.slug}
                  className="rounded-t-lg first:rounded-bl-sm last:rounded-br-sm"
                  onClick={() => setSelectedCategoryId(category._id)}
                >
                  {category?.icon && (
                    <DynamicIcon name={category.icon as IconName} />
                  )}
                  {category.name}
                </TabsTrigger>
              ))}
              <div className="flex-1"></div>
              <Button
                size="icon"
                variant={"ghost"}
                className="rounded-lg"
                onClick={() => setSearchPlayer(searchPlayer !== false ? false : "")}
              >
                <DynamicIcon name="search" className="size-4" />
              </Button>
            </TabsList>
          </div>`
);

// append PlayerSearchDrawer component inside main
content = content.replace(
  /<\/main>/,
  `\n      <PlayerSearchDrawer />\n    </main>`
);

fs.writeFileSync(file, content);
