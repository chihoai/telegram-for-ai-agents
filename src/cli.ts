#!/usr/bin/env node

import { loadEnvironment } from './app/environment.js';
import { restrictProcessFileCreation } from './app/privateFiles.js';
import { runCliMain } from './core/cli-runner.js';

restrictProcessFileCreation();
loadEnvironment();
void runCliMain(process.argv.slice(2));
