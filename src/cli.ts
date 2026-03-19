#!/usr/bin/env node

import 'dotenv/config';
import { runCliMain } from './core/cli-runner.js';

void runCliMain(process.argv.slice(2));
