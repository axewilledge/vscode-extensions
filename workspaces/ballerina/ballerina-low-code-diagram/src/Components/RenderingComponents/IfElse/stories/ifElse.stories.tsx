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
import React, { useEffect, useState } from 'react';

// tslint:disable-next-line:no-submodule-imports
import { Story } from '@storybook/react/types-6-0';
import { FunctionDefinition,  IfElseStatement,  ModulePart, STKindChecker } from '@wso2/syntax-tree';

import { IfElse } from "..";
import { Provider } from '../../../../Context/diagram';
import { LowCodeDiagramProps } from '../../../../Context/types';
import { fetchSyntaxTree, getComponentDataPath, getFileContent  } from '../../../../stories/story-utils';
import { sizingAndPositioning } from '../../../../Utils';
import { Function } from '../../Function';

export default {
    title: 'Diagram/Component/IfElse',
    component: IfElse,
};

const componentName = "IfElse";
const samplefile1 = "sample1.bal";

const Template: Story<{ f1: string }> = (args: {f1: string }) => {

    const [st, setSt] = useState<ModulePart>(undefined);

    const providerProps: LowCodeDiagramProps = {
        syntaxTree: st,
        isReadOnly: true,
        selectedPosition: {
            startColumn: 0,
            startLine: 0
        }
    };

    useEffect(() => {

        const filePath = `${getComponentDataPath(componentName, samplefile1)}`;

        async function setSyntaxTree() {
            const syntaxTree = await fetchSyntaxTree(filePath) as ModulePart;
            setSt(syntaxTree);
        }
        setSyntaxTree();
    }, []);

    if (!st) {
        return <></>;
    }

    const functionST: FunctionDefinition = st && STKindChecker.isFunctionDefinition(st.members[0]) && st.members[0];
    const ifelseST = functionST && STKindChecker.isFunctionBodyBlock(functionST.functionBody)
                         && STKindChecker.isIfElseStatement(functionST.functionBody.statements[0])
                         && functionST.functionBody.statements[0];
    const visitedIfST: IfElseStatement = (ifelseST && sizingAndPositioning(ifelseST)) as IfElseStatement;

    const visitedST: FunctionDefinition = (functionST && sizingAndPositioning(functionST)) as FunctionDefinition;

    return st &&
    // tslint:disable-next-line: jsx-wrap-multiline
    <>
        <Provider {...providerProps}>
            <IfElse model={visitedIfST} />
            <Function model={visitedST} />
        </Provider>
    </>;
}

export const IfElseComponent = Template.bind({});
IfElseComponent.args = {
    f1: ""
};
