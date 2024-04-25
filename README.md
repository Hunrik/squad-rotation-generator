# Project Name

## Description

This is a CLI tool that generates rotations based on the provided layer information. The tool allows you to filter the rotations based on factions, game modes, layers, and maps.

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/yourusername/yourrepository.git
cd yourrepository
npm install
```

## Usage

You can run the tool with the following command:

```bash
node index.js --input ./layerinfo.csv --out ./output.txt
```

Here are the available options:

`--input` or `-i`: Set the input file. Default is `./layerinfo.csv`.
`--out` or `-o`: Set the output file. If not provided, the output will be written to stdout.
You can also filter the rotations with the following options:

`--factions`: A comma-separated list of factions.
`--gamemode`: A comma-separated list of game modes.
`--layers`: A comma-separated list of layers.
`--maps`: A comma-separated list of maps.