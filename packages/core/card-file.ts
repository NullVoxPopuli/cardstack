import { outputJSONSync, outputFileSync, readJsonSync, readFileSync, statSync, readdirSync } from 'fs-extra';
import { join } from 'path';
import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';
import { SingleResourceDoc } from 'jsonapi-typescript';
import { Card } from './card';
import { assertSingleResourceDoc } from './jsonapi';

export type Entry = { mtime: number; size: number } | Map<string, Entry>;

export function writeCard(cardPath: string, doc: SingleResourceDoc) {
  if (doc.data.attributes?.csFiles) {
    writeCSFiles(cardPath, doc.data.attributes?.csFiles as NonNullable<Card['csFiles']>);
    doc = cloneDeep(doc);
    delete doc.data.attributes!.csFiles;
  }

  outputJSONSync(join(cardPath, 'package.json'), {});
  outputJSONSync(join(cardPath, 'card.json'), doc);
}

function writeCSFiles(outDir: string, files: NonNullable<Card['csFiles']>) {
  for (let [name, entry] of Object.entries(files)) {
    if (typeof entry === 'string') {
      outputFileSync(join(outDir, name), entry, 'utf8');
    } else {
      writeCSFiles(join(outDir, name), entry);
    }
  }
}

export function crawl(cardsDirectory: string): Map<string, Entry> {
  let output: Map<string, Entry> = new Map();
  for (let name of readdirSync(cardsDirectory)) {
    if (name.startsWith('.') || name === 'node_modules') {
      continue;
    }
    let fullName = join(cardsDirectory, name);
    let stat = statSync(fullName);
    if (stat.isDirectory()) {
      output.set(name, crawl(fullName));
    } else {
      output.set(name, { mtime: stat.mtime.getDate(), size: stat.size });
    }
  }
  return output;
}

export function readCard(cardDirectory: string, files: Map<string, Entry>): SingleResourceDoc {
  let pkg;
  try {
    pkg = readJsonSync(join(cardDirectory, 'package.json'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Card does not have a valid package.json file`);
    }
    throw err;
  }

  let json;
  try {
    json = readJsonSync(join(cardDirectory, 'card.json'));
    assertSingleResourceDoc(json);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Card does not have a valid card.json file`);
    }
    if ('isCardstackError' in err) {
      throw new Error(`card.json is invalid because: ${err}`);
    }
    throw err;
  }

  // ensure we have an attributes object
  merge(json, {
    data: {
      attributes: {},
      meta: {
        cardDir: cardDirectory,
      },
    },
  });

  // then ensure that csFiles reflects our true on disk files only
  json.data.attributes!.csFiles = loadFiles(cardDirectory, files, ['package.json', 'card.json']);

  // and our peerDeps match the ones from package.json
  // @ts-ignore
  json.data.attributes!.csPeerDependencies = pkg.peerDependencies;
  return json;
}

function loadFiles(dir: string, files: Map<string, Entry>, exclude: string[] = []) {
  let output: NonNullable<Card['csFiles']> = Object.create(null);
  for (let [name, entry] of files) {
    if (exclude.includes(name)) {
      continue;
    }
    let fullName = join(dir, name);
    if (entry instanceof Map) {
      output[name] = loadFiles(fullName, entry);
    } else {
      output[name] = readFileSync(fullName, 'utf8');
    }
  }
  return output;
}
