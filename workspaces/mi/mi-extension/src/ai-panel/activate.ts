/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import { openAIWebview } from './aiMachine';
import { extension } from '../MIExtensionContext';
import { PromptObject } from '@wso2/mi-core';

export function activateAiPanel(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_AI_PANEL, (initialPrompt?: PromptObject) => {
            openAIWebview(initialPrompt);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.CLEAR_AI_PROMPT, () => {
            extension.initialPrompt = undefined;
        })
    );
}
