/* eslint-disable react-hooks/exhaustive-deps */
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
import { ActionButtons, Divider, SidePanelBody, Typography, ProgressIndicator, FormContainer } from '@wso2/ui-toolkit';
import { FunctionName } from './FunctionName/FunctionName';
import { FunctionReturn } from './Return/FunctionReturn';
import styled from '@emotion/styled';
import { FunctionModel, ParameterModel, PropertyModel, ReturnTypeModel } from '@wso2/ballerina-core';
import { Parameters } from './Parameters/Parameters';
import { EditorContentColumn } from '../../styles';
import FormGeneratorNew from '../../../Forms/FormGeneratorNew';
import { FormField } from '@wso2/ballerina-side-panel';
import { convertConfig } from '../../../../../utils/bi';

export interface ResourceFormProps {
	functionName: string;
	model: FunctionModel;
	filePath: string;
	onSave: (functionModel: FunctionModel) => void;
	onClose: () => void;
}

export function FunctionForm(props: ResourceFormProps) {
	const { functionName, model, filePath, onSave, onClose } = props;

	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [saving, setSaving] = useState<boolean>(false);
	const [functionModel, setFunctionModel] = useState<FunctionModel>(model);
	const [functionFields, setFunctionFields] = useState<FormField[]>([]);


	useEffect(() => {
		let fields = model ? convertConfig(model.properties) : [];
		// update description fields as "TEXTAREA"
		fields.forEach((field) => {
			if (field.key === "functionNameDescription" || field.key === "typeDescription") {
				field.type = "TEXTAREA";
			}
			if (field.key === "parameters") {
				if ((field.valueTypeConstraint as any).value.parameterDescription) {
					(field.valueTypeConstraint as any).value.parameterDescription.type = "TEXTAREA";
				}
			}
		});
		setFunctionFields(fields);
	}, [model]);


	useEffect(() => {
		console.log("Function Model", model);
	}, []);

	const onNameChange = (name: PropertyModel) => {
		const updatedFunctionModel = {
			...functionModel,
			name: name,
		};
		setFunctionModel(updatedFunctionModel);
		console.log("Name Change: ", updatedFunctionModel);
	}

	const handleParamChange = (params: ParameterModel[]) => {
		const updatedFunctionModel = {
			...functionModel,
			parameters: params
		};
		setFunctionModel(updatedFunctionModel);
		console.log("Parameter Change: ", updatedFunctionModel);
	};

	const handleResponseChange = (response: ReturnTypeModel) => {
		response.value = "";
		const updatedFunctionModel = {
			...functionModel,
			returnType: response
		};
		setFunctionModel(updatedFunctionModel);
		console.log("Response Change: ", updatedFunctionModel);
	};

	const handleSave = () => {
		onSave(functionModel);
	}

	return (
		<>
			{isLoading && <ProgressIndicator id="resource-loading-bar" />}
			<SidePanelBody>
				<FormContainer>
					{filePath && functionFields.length > 0 &&
						<FormGeneratorNew
							fileName={filePath}
							nestedForm={true}
							fields={functionFields}
							isSaving={saving}
							onSubmit={handleSave}
							submitText={saving ? (functionName ? "Saving..." : "Creating...") : (functionName ? "Save" : "Create")}
							preserveFieldOrder={true}
						/>
					}
				</FormContainer>
			</SidePanelBody>
		</>
	);
}
