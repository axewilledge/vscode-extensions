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

import { useState } from "react";
import { Response } from "../../../Definitions/ServiceDefinitions";
import { RefResponse } from "./RefResponse";

export default {
    component: RefResponse,
    title: 'New Ref Request Body',
};

const r: Response = {
    description: "Test",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: {
                    name: {
                        type: "string"
                    },
                    age: {
                        type: "number"
                    }
                }
            }
        }
    }
};


export const RefResponseStory = () => {
    const [response, setResponse] = useState<Response>(r);
    const [name, setName] = useState<string>("Test");
    const onParameterChange = (requestBody: Response, name: string) => {
        setResponse(requestBody);
        setName(name);
    }
    return (
        <RefResponse
            responseName={name}
            response={response}
            onResponseChange={onParameterChange}
        />
    );
};
