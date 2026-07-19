const fs = require('fs');
const file = 'convex/components/tournaments/modules/matches/get.ts';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `      return {
        _id: match._id,
        status: mapStatus(match.status),
        scheduledAt: match.dateStart,
        points,
        sets: match.sets,
        teams: [teamA, teamB],
      };
    }),
  );`;

const newStr = `      const category = await ctx.db.get(match.tournamentCategoryId);
      const group = match.groupId ? await ctx.db.get(match.groupId) : null;

      return {
        _id: match._id,
        status: mapStatus(match.status),
        categoryId: match.tournamentCategoryId,
        categoryName: category?.name,
        groupId: match.groupId,
        groupName: group?.name,
        stage: match.stage,
        scheduledAt: match.dateStart,
        points,
        sets: match.sets,
        teams: [teamA, teamB],
      };
    }),
  );`;

content = content.replace(oldStr, newStr);
fs.writeFileSync(file, content);
console.log('patched');
