const assetUrl = (path) => new URL(`../assets/${path}`, import.meta.url).href;

export const ASSETS = {
  "sheets": {
    "overworld": assetUrl("sheets/overworld.png"),
    "portraits": assetUrl("sheets/portraits.png"),
    "artifacts": assetUrl("sheets/artifacts.png"),
    "spells": assetUrl("sheets/spells.png")
  },
  "units": {
    "heroMap": {
      "src": assetUrl("units/hero-map.png"),
      "frameW": 64,
      "frameH": 48,
      "frames": 8
    },
    "peasant": {
      "src": assetUrl("units/peasant.png"),
      "frameW": 58,
      "frameH": 72,
      "frames": 6
    },
    "paladin": {
      "src": assetUrl("units/paladin.png"),
      "frameW": 76,
      "frameH": 108,
      "frames": 10
    },
    "skeleton": {
      "src": assetUrl("units/skeleton.png"),
      "frameW": 64,
      "frameH": 88,
      "frames": 9
    },
    "goblin": {
      "src": assetUrl("units/goblin.png"),
      "frameW": 58,
      "frameH": 84,
      "frames": 8
    },
    "archer": {
      "src": assetUrl("units/archer.png"),
      "frameW": 58,
      "frameH": 84,
      "frames": 10
    },
    "dragon": {
      "src": assetUrl("units/dragon.png"),
      "frameW": 112,
      "frameH": 128,
      "frames": 12
    }
  },
  "town": {
    "background": assetUrl("town/knight-bg.png"),
    "castle": {
      "src": assetUrl("town/knight-castle.png"),
      "w": 378,
      "h": 139
    },
    "dwellings": [
      {
        "src": assetUrl("town/dwelling-archer.png"),
        "w": 173,
        "h": 92
      },
      {
        "src": assetUrl("town/dwelling-swords.png"),
        "w": 180,
        "h": 82
      },
      {
        "src": assetUrl("town/dwelling-paladin.png"),
        "w": 492,
        "h": 143
      }
    ]
  },
  "portraitGrid": {
    "frameW": 101,
    "frameH": 93,
    "gapX": 9,
    "gapY": 7,
    "columns": 6
  }
};
