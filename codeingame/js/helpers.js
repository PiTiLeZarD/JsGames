/** Array */
const groupBy = (a, size) =>
    a.reduce(
        (acc, el, i) =>
            i % size ? acc.map((elj, j, aj) => (j === aj.length - 1 ? [...elj, el] : elj)) : [...acc, [el]],
        []
    );
const spreadBy = (a, size) =>
    a.reduce(
        (acc, el, i) => {
            acc[i % size].push(el);
            return acc;
        },
        new Array(size).fill().map((_) => [])
    );
const transpose = (a) => a[0].map((_, colIndex) => a.map((row) => row[colIndex]));
const unique = (a) => a.filter((v, i, aa) => aa.indexOf(v) === i);

/** Path */
const inPath = (path, x, y) => path.reduce((acc, [px, py]) => acc || (px === x && py === y), false);

/** Board */
const getCell = (b, x, y) => b[y][x];
const cloneBoard = (b) => [...b.map((r) => [...r])];
const displayBoard = (b) => b.forEach(row => console.error(row.join('')))
const inBoard = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
const subBoard = (b, x, y, w, h) => new Array(h).fill(null).map((_, sy) => new Array(w).fill(null).map((__, sx) => b[sy+y][sx+x]))
const positionsOf = (b, cells) =>
    b.reduce(
        (acc, row, y) => [...acc, ...row.reduce((racc, c, x) => (cells.includes(c) ? [...racc, [x, y]] : racc), [])],
        []
    );
const surroundingPositions = (x, y, corners = false, accross = false) =>
    [
        [x - 1, y],
        [x, y + 1],
        [x + 1, y],
        [x, y - 1],
        ...(corners
            ? [
                  [x - 1, y - 1],
                  [x - 1, y + 1],
                  [x + 1, y + 1],
                  [x + 1, y - 1],
              ]
            : []),
    ].map(([x, y]) => inBoard(x, y) ? [x, y] : (accross ? [(x+ W) % W, (y + H) % H] : null))
     .filter((e) => !!e);

/** Strings */
const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const rotor = (s, from, to) =>
    s
        .split("")
        .map((c) => to.charAt(from.indexOf(c)))
        .join("");
const ceasar = (n, s) =>
    s
        .split("")
        .map((c, i) => alpha.charAt((alpha.indexOf(c) + i + n) % alpha.length))
        .join("");
const unceasar = (n, s) =>
    s
        .split("")
        .map((c, i) => alpha.charAt((alpha.indexOf(c) - i - n + alpha.length * 100) % alpha.length))
        .join("");
const randomString = () => (Math.random() + 1).toString(36).substring(2);
const leadingGroup = (s) => {
    const r = new RegExp(`^([${s.charAt(0)}]{1,})`);
    return s.match(r)[0];
};
const splitStringInGroups = (s) => {
    const groups = [];
    while (s.length) {
        const g = leadingGroup(s);
        groups.push(g);
        s = s.slice(g.length);
    }
    return groups;
};
const rxChars = (t) =>
    t
        .split("")
        .map((c) => `[${c}]`)
        .join("");

/** tokens */
const hasTokens = (t) => t.match(/[$][0-9]+/m);
const tokenName = () => `$${Object.keys(tokens).length + 1}`;
// text = tokenise(text, "mytokentype", text.matchAll(/rxtokenmatch/gm));
const tokenise = (t, type, res) => {
    if (res) {
        [...res]
            .map((match) => {
                const [matching, ...data] = match;
                return [match.index, matching, data];
            })
            .forEach(([index, matching, data], i, a) => {
                const tn = tokenName();
                tokens[tn] = { type, data };
                t = `${t.substr(0, index)}${tn}${t.substr(index + matching.length)}`;
                for (let c = i + 1; c < a.length; c++) {
                    a[c][0] -= matching.length - tn.length;
                }
            });
    }
    return t;
};

/** geo */
const rad = (n) => n * (Math.PI / 180);
const dist = (lat1, lon1, lat2, lon2) =>
    Math.sqrt(
        Math.pow((rad(lon2) - rad(lon1)) * Math.cos((rad(lon1) + rad(lon2)) / 2), 2) +
            Math.pow(rad(lat2) - rad(lat1), 2)
    ) * 6371;

/* graphs */
const node = (x, y) => `${x}_${y}`
const parseNode = (n) => n.split('_').map(e => +e)
const dijkstra = (graph, origin, destination = null, nodes = null) => {
    if (nodes == null) {
        const startupNodes = Object.fromEntries(
            Object.keys(graph).map(node => [node, {distance: Infinity, label: 'unvisited', path: null}])
        )
        startupNodes[origin].label = 'current';
        startupNodes[origin].distance = 0;
        startupNodes[origin].path = [];
        return dijkstra(graph, origin, destination, startupNodes);
    }
    Object.keys(nodes).filter(node => nodes[node].label == 'current').forEach(currentNode => {
        nodes[currentNode].label = 'visited';
        graph[currentNode]
            .filter(n => nodes[n].label == 'unvisited')
            .map(n => {
                nodes[n].distance = nodes[currentNode].distance + 1;
                nodes[n].label = 'current';
                nodes[n].path = [...nodes[currentNode].path, n]
            });
    })
    if (destination && nodes[destination].distance < Infinity) return nodes;
    if (Object.keys(nodes).filter(n => nodes[n].label == 'current').length) dijkstra(graph, origin, destination, nodes)
    return nodes;
}

const board2graph = (b, accross=true) => Object.fromEntries(
    b.map((row, y) => row.map((_, x) => [x, y]))
        .flat()
        .filter(([x, y]) => isEmpty(getCell(b, x, y)))
        .map(([x, y]) => ([
            `${x}_${y}`,
            surroundingPositions(x, y, false, accross)
            .filter(([x, y]) => isEmpty(getCell(b, x, y)))
        ]))
)

/* direction */
const direction = (fx, fy, tx, ty) => `${ty>fy?'S':ty<fy?'N':''}${tx>fx?'E':tx<fx?'W':''}`
const move = (direction) => ({N:'UP',S:'DOWN',E:'RIGHT',W:'LEFT'}[direction] || null)
const travelTo = (x, y, direction) => {
    if (direction.includes('S')) y += 1;
    if (direction.includes('N')) y -= 1;
    if (direction.includes('E')) x += 1;
    if (direction.includes('W')) x -= 1;
    return [x, y];
}