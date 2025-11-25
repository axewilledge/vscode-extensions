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

import styled from "@emotion/styled";
import {
    DIRECTORY_MAP,
    EVENT_TYPE,
    FunctionModel,
    LineRange,
    MACHINE_VIEW,
    ProjectStructureArtifactResponse,
    ComponentInfo,
    ServiceModel,
    FunctionTypes
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { NodePosition } from "@wso2/syntax-tree";
import { Button, Codicon, Icon, TextField, Typography, View } from "@wso2/ui-toolkit";
import { useEffect, useRef, useState } from "react";
import { LoadingRing } from "../../../components/Loader";
import { TitleBar } from "../../../components/TitleBar";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { isPositionChanged } from "../../../utils/utils";
import { AddServiceElementDropdown, DropdownOptionProps } from "./components/AddServiceElementDropdown";
import { ResourceAccordion } from "./components/ResourceAccordion";
import { ResourceAccordionV2 } from "./components/ResourceAccordionV2";
import { FunctionConfigForm } from "./Forms/FunctionConfigForm";
import { ResourceForm } from "./Forms/ResourceForm";
import { McpToolForm } from "./Forms/McpToolForm";
import { removeForwardSlashes, canDataBind, getReadableListenerName } from "./utils";
import { DatabindForm } from "./Forms/DatabindForm";
import { FunctionForm } from "./Forms/FunctionForm";

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    flex-direction: column;
`;

const ServiceContainer = styled.div`
    padding-right: 10px;
    padding-left: 10px;
    flex-grow: 1;
    overflow-y: auto;
    height: 0; /* This forces the flex item to use available space */
`;

const FunctionsContainer = styled.div`
    max-height: 550px;
    overflow: scroll;
    padding: 15px;
    padding-right: 0px;
`;

const ButtonText = styled.span`
    @media (max-width: 768px) {
        display: none;
    }
    width: 100%;
`;

const HeaderContainer = styled.div`
    display: flex;
    padding: 0px 15px;
    align-items: center;
    justify-content: space-between;
`;

const ActionGroup = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
`;

const ServiceMetadataContainer = styled.div`
    padding: 12px 25px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--vscode-editor-background);
`;

const MetadataRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
`;

const MetadataLabel = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
    min-width: 60px;
`;

const ListenerBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    background: var(--vscode-editorWidget-background, #f3f3f3);
    color: var(--vscode-descriptionForeground, #888);
    border-radius: 10px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.12s;

    &:hover {
        background: var(--vscode-editorWidget-border, #e0e0e0);
        transform: none;
    }
`;

const PropertyInline = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    font-size: 11px;
    height: 24px;
    pointer-events: none;
`;

const PropertyKey = styled.span`
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
`;

const PropertyValue = styled.span`
    color: var(--vscode-input-foreground);
    font-family: var(--vscode-editor-font-family);
`;

const EmptyReadmeContainer = styled.div`
    display: flex;
    margin: 80px 0px;
    flex-direction: column;
    align-items: center;
    gap: 8px;
`;

const Description = styled(Typography)`
    color: var(--vscode-descriptionForeground);
`;

interface ServiceDesignerProps {
    projectPath: string;
    filePath: string;
    position: NodePosition;
    serviceIdentifier: string;
}

interface ReadonlyProperty {
    label: string;
    value: string | string[];
}

export const ADD_HANDLER = "add-handler";
export const ADD_INIT_FUNCTION = "add-init-function";
export const ADD_REUSABLE_FUNCTION = "add-reusable-function";
export const EXPORT_OAS = "export-oas";
export const ADD_HTTP_RESOURCE = "add-http-resource";

enum MODEL_TYPE {
    HTTP_RESOURCE = "http-resource",
    INIT_FUNCTION = "init-function",
    SUB_FUNCTION = "sub-function",
    MCP_TOOL = "mcp-tool",
    HANDLER = "handler",
}

export function ServiceDesigner(props: ServiceDesignerProps) {
    const { projectPath, filePath, position, serviceIdentifier } = props;
    const { rpcClient } = useRpcContext();
    const [serviceModel, setServiceModel] = useState<ServiceModel>(undefined);

    const [modelType, setModelType] = useState<MODEL_TYPE>(undefined);
    const [functionModel, setFunctionModel] = useState<FunctionModel>(undefined);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const [isNew, setIsNew] = useState<boolean>(false);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [showFunctionConfigForm, setShowFunctionConfigForm] = useState<boolean>(false);

    const prevPosition = useRef(position);

    const [resources, setResources] = useState<ProjectStructureArtifactResponse[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    const [listeners, setListeners] = useState<string[]>([]);
    const [readonlyProperties, setReadonlyProperties] = useState<Set<ReadonlyProperty>>(new Set());

    const [isHttpService, setIsHttpService] = useState<boolean>(false);
    const [isMcpService, setIsMcpService] = useState<boolean>(false);

    const [dropdownOptions, setDropdownOptions] = useState<DropdownOptionProps[]>([]);

    const [enabledHandlers, setEnabledHandlers] = useState<FunctionModel[]>([]);
    const [unusedHandlers, setUnusedHandlers] = useState<FunctionModel[]>([]);
    const [selectedHandler, setSelectedHandler] = useState<FunctionModel>(undefined);

    const handleCloseSideForm = () => {
        setShowForm(false);
        setFunctionModel(undefined);
        setModelType(undefined);
        // If a handler was selected, also clear it
        if (selectedHandler) {
            setSelectedHandler(undefined);
        }
    };

    useEffect(() => {
        if (!serviceModel || isPositionChanged(prevPosition.current, position)) {
            fetchService(position);
        }

        rpcClient.onProjectContentUpdated(() => {
            fetchService(position);
        });
    }, [position]);

    const fetchService = (targetPosition: NodePosition, addMore?: boolean) => {
        const lineRange: LineRange = {
            startLine: { line: targetPosition.startLine, offset: targetPosition.startColumn },
            endLine: { line: targetPosition.endLine, offset: targetPosition.endColumn },
        };
        try {
            rpcClient
                .getServiceDesignerRpcClient()
                .getServiceModelFromCode({ filePath, codedata: { lineRange } })
                .then((res) => {
                    console.log("Service Model: ", res.service);
                    if (addMore) {
                        handleNewHTTPResource();
                    } else {
                        setShowForm(false);
                    }
                    setServiceModel(res.service);
                    setServiceMetaInfo(res.service);
                    setIsSaving(false);
                    prevPosition.current = targetPosition;
                });
        } catch (error) {
            console.log("Error fetching service model: ", error);
        }
        getProjectListeners();
    };

    const setServiceMetaInfo = (service: ServiceModel) => {
        if (service?.properties?.listener) {
            const listenerProperty = service.properties.listener;
            if (listenerProperty.values && listenerProperty.values.length > 0) {
                setListeners(listenerProperty.values);
            } else if (listenerProperty.value) {
                setListeners([listenerProperty.value]);
            }
        }
        if (service?.properties) {
            // Extract readonly properties from readOnlyMetadata if available
            const readonlyProps: Set<ReadonlyProperty> = new Set();
            const readOnlyMetadata = service.properties.readOnlyMetadata;

            if (readOnlyMetadata?.enabled && readOnlyMetadata.value && typeof readOnlyMetadata.value === "object" && !Array.isArray(readOnlyMetadata.value)) {
                Object.entries(readOnlyMetadata.value).forEach(([label, values]) => {
                    if (Array.isArray(values) && values.length > 0) {
                        readonlyProps.add({
                            label,
                            value: values.length === 1 ? values[0] : values
                        });
                    }
                });
            }

            setReadonlyProperties(readonlyProps);
            setIsHttpService(service.moduleName === "http");
            setIsMcpService(service.moduleName === "mcp");
        }

        // Extract object methods if available (for service classes)
        const objectMethods: FunctionModel[] = [];
        const enabledHandlers: FunctionModel[] = [];
        const unusedHandlers: FunctionModel[] = [];

        let hasInitMethod = false;
        service.functions.forEach(func => {
            if (func.kind === "DEFAULT") {
                if (func.name?.value === "init") {
                    hasInitMethod = true;
                } else {
                    objectMethods.push(func);
                }
            }
            if (func.kind === "REMOTE" || func.kind === "RESOURCE") {
                if (func.enabled) {
                    enabledHandlers.push(func);
                } else {
                    unusedHandlers.push(func);
                }
            }
        });

        setEnabledHandlers(enabledHandlers);
        setUnusedHandlers(unusedHandlers);

    }

    const getProjectListeners = () => {
        rpcClient.getVisualizerLocation().then((location) => {
            const projectPath = location.projectPath;
            rpcClient.getBIDiagramRpcClient().getProjectStructure().then((res) => {
                const project = res.projects.find(project => project.projectPath === projectPath);
                const services = project?.directoryMap[DIRECTORY_MAP.SERVICE];
                if (services && services.length > 0) {
                    const selectedService = services.find((service) => service.name === serviceIdentifier);
                    if (selectedService?.moduleName === "mcp") {
                        const updatedResources = selectedService.resources.map(resource => ({
                            ...resource,
                            icon: "tool"
                        }));
                        setResources(updatedResources);
                    } else if (selectedService) {
                        setResources(selectedService.resources);
                        let hasInitMethod = selectedService.resources.filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name === "init").length > 0;
                        const options: DropdownOptionProps[] = [];
                        if (!hasInitMethod) {
                            options.push({
                                title: "Add Init Function",
                                description: "Add a new init function within the service",
                                value: ADD_INIT_FUNCTION
                            });
                        }
                        options.push({
                            title: "Add Sub Flow",
                            description: "Add a new reusable function within the service",
                            value: ADD_REUSABLE_FUNCTION
                        });
                        if (selectedService.moduleName === "http") {
                            options.push({
                                title: "Export OpenAPI Spec",
                                description: "Export the OpenAPI spec for the service",
                                value: EXPORT_OAS
                            });
                        }

                        setDropdownOptions(options);
                    }
                }
            });
        });
    };

    const handleOpenDiagram = async (resource: FunctionModel) => {
        const lineRange: LineRange = resource.codedata.lineRange;
        const nodePosition: NodePosition = {
            startLine: lineRange.startLine.line,
            startColumn: lineRange.startLine.offset,
            endLine: lineRange.endLine.line,
            endColumn: lineRange.endLine.offset,
        };
        await rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.OPEN_VIEW, location: { position: nodePosition, documentUri: filePath } });
    };

    const handleServiceEdit = async () => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIServiceConfigView,
                position: position,
                documentUri: filePath,
            },
        });
    };

    //** <-------------------- Model fetching functions start --------------------------------> **//
    const handleNewFunction = (type: "http" | "mcp" | "object", functionName: FunctionTypes, logMsg: string) => {
        rpcClient
            .getServiceDesignerRpcClient()
            .getFunctionModel({ type, functionName })
            .then((res) => {
                console.log(logMsg, res.function);
                setFunctionModel(res.function);
                setIsNew(true);
                setShowForm(true);
            });
    };

    const handleNewHTTPResource = () => {
        handleNewFunction("http", "resource", "New HTTP Resource Model: ");
        setModelType(MODEL_TYPE.HTTP_RESOURCE);
    }
    const handleNewMcpTool = () => {
        handleNewFunction("mcp", "remote", "New MCP Tool Model: ");
        setModelType(MODEL_TYPE.MCP_TOOL);
    }
    const handleNewObjectMethod = () => {
        handleNewFunction("object", "default", "New Function Model: ");
        setModelType(MODEL_TYPE.SUB_FUNCTION);
    }
    const handleNewInitFunction = () => {
        handleNewFunction("object", "init", "New Init Function Model: ");
        setModelType(MODEL_TYPE.INIT_FUNCTION);
    }
    //** <-------------------- Model fetching functions end --------------------------------> **//


    //** <-------------------- Handler selection functions start --------------------------------> **//
    const onSelectAddHandler = () => {
        setIsNew(true);
        setShowFunctionConfigForm(true);
    };

    const onHandlerSelected = (handler: FunctionModel) => {
        // Check if this handler is databindable
        if (canDataBind(handler)) {
            // For databindable functions, show DatabindForm for configuration
            setSelectedHandler(handler);
            setFunctionModel(handler);
            setModelType(MODEL_TYPE.HANDLER);
            setShowForm(true);
            // Close the FunctionConfigForm to show the DatabindForm instead
            setShowFunctionConfigForm(false);
        } else {
            // For regular functions, immediately add without showing a form
            handler.enabled = true;
            setShowFunctionConfigForm(false);
            handleFunctionSubmit(handler);
        }
    };

    const handleMoreOptions = (option: string) => {
        switch (option) {
            case ADD_REUSABLE_FUNCTION:
                handleNewObjectMethod();
                break;
            case ADD_INIT_FUNCTION:
                handleNewInitFunction();
                break;
            case ADD_HANDLER:
                onSelectAddHandler();
                break;
            case ADD_HTTP_RESOURCE:
                handleNewHTTPResource();
                break;
            case EXPORT_OAS:
                handleExportOAS();
                break;
        }
    };

    const handleNewFunctionClose = () => {
        setShowForm(false);
        // If a handler was selected, also close the FunctionConfigForm
        if (selectedHandler) {
            setShowFunctionConfigForm(false);
            setSelectedHandler(undefined);
        }
    };

    const handleFunctionEdit = (value: FunctionModel) => {
        // Determine the model type based on the function kind and service type
        if (value.kind === "INIT") {
            setFunctionModel(value);
            setModelType(MODEL_TYPE.INIT_FUNCTION);
        } else if (isHttpService && value.kind === "RESOURCE") {
            setFunctionModel(value);
            setModelType(MODEL_TYPE.HTTP_RESOURCE);
        } else if (isMcpService && (value.kind === "REMOTE" || value.kind === "OBJECT_METHOD")) {
            setFunctionModel(value);
            setModelType(MODEL_TYPE.MCP_TOOL);
        } else if (!isHttpService && !isMcpService && (value.kind === "REMOTE" || value.kind === "RESOURCE") && canDataBind(value)) {
            setFunctionModel(value);
            setModelType(MODEL_TYPE.HANDLER);
        } else {
            setFunctionModel(value);
            setModelType(MODEL_TYPE.SUB_FUNCTION);
        }
        setIsNew(false);
        setShowForm(true);
    };

    const handleFunctionDelete = async (model: FunctionModel) => {
        console.log("Deleting Resource Model:", model);
        const component: ComponentInfo = {
            name: model.name.value,
            filePath: model.codedata.lineRange.fileName,
            startLine: model.codedata.lineRange.startLine.line,
            startColumn: model.codedata.lineRange.startLine.offset,
            endLine: model.codedata.lineRange.endLine.line,
            endColumn: model.codedata.lineRange.endLine.offset,
        };
        await rpcClient.getBIDiagramRpcClient().deleteByComponentInfo({ filePath, component });

        const context = await rpcClient.getVisualizerLocation();
        const projectPath = context.projectPath;
        const projectStructure = await rpcClient.getBIDiagramRpcClient().getProjectStructure();
        const project = projectStructure.projects.find(project => project.projectPath === projectPath);

        const serviceArtifact = project.directoryMap[DIRECTORY_MAP.SERVICE].find(res => res.name === serviceIdentifier);
        if (serviceArtifact) {
            await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
            fetchService(serviceArtifact.position);
        }
    };

    /**
     * This function invokes when a new function is added using right panel form.
     *
     * @param value
     * @param openDiagram - Whether to open the flow diagram after saving
     */
    const handleFunctionSubmit = async (value: FunctionModel, openDiagram: boolean = false) => {
        setIsSaving(true);
        const lineRange: LineRange = {
            startLine: { line: position.startLine, offset: position.startColumn },
            endLine: { line: position.endLine, offset: position.endColumn },
        };
        let res = undefined;
        if (isNew) {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .addFunctionSourceCode({ filePath, codedata: { lineRange }, function: value, artifactType: DIRECTORY_MAP.SERVICE });
            const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
            if (serviceArtifact) {
                if (openDiagram) {
                    // Navigate to flow diagram for the newly created handler
                    const handler = serviceArtifact.resources?.find(
                        r => r.name === value.name.value
                    );
                    if (handler) {
                        await rpcClient.getVisualizerRpcClient().openView({
                            type: EVENT_TYPE.OPEN_VIEW,
                            location: { documentUri: handler.path, position: handler.position }
                        });
                    }
                } else {
                    // Just update the project location
                    fetchService(serviceArtifact.position);
                    await rpcClient.getVisualizerRpcClient().openView({
                        type: EVENT_TYPE.UPDATE_PROJECT_LOCATION,
                        location: { documentUri: serviceArtifact.path, position: serviceArtifact.position }
                    });
                }
            }
        } else {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .updateFunctionSourceCode({ filePath, codedata: { lineRange }, function: value, artifactType: DIRECTORY_MAP.SERVICE });
            const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
            if (serviceArtifact) {
                fetchService(serviceArtifact.position);
                await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
            }
        }
        setIsNew(false);
        setFunctionModel(undefined);
        handleNewFunctionClose();
        handleFunctionConfigClose();
        setIsSaving(false);
    };

    const handleFunctionConfigClose = () => {
        setShowFunctionConfigForm(false);
    };

    const handleServiceTryIt = () => {
        const basePath = serviceModel.properties?.basePath?.value?.trim();
        const listener = serviceModel.properties?.listener?.value?.trim();
        const commands = ["ballerina.tryIt", false, undefined, { basePath, listener }];
        rpcClient.getCommonRpcClient().executeCommand({ commands });
    }

    const handleExportOAS = () => {
        rpcClient.getServiceDesignerRpcClient().exportOASFile({});
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.target.value);
    };

    const haveServiceTypeName = serviceModel?.properties["serviceTypeName"]?.value;

    const openInit = async (resource: ProjectStructureArtifactResponse) => {
        await rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.OPEN_VIEW, location: { position: resource.position, documentUri: resource.path } });
    }


    const resourcesCount = resources
        .filter((resource) => resource.type === DIRECTORY_MAP.RESOURCE)
        .filter((resource) => {
            const search = searchValue.toLowerCase();
            const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
            const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
            return nameMatch || iconMatch;
        })
        .length;

    const remoteFunctionsCount = resources
        .filter((resource) => resource.type === DIRECTORY_MAP.REMOTE)
        .filter((resource) => {
            const search = searchValue.toLowerCase();
            const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
            const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
            return nameMatch || iconMatch;
        })
        .length;

    function createLineRange(filePath: string, position: NodePosition): LineRange {
        return {
            fileName: filePath,
            startLine: {
                line: position.startLine ?? 1,
                offset: position.startColumn ?? 0
            },
            endLine: {
                line: position.endLine ?? position.startLine ?? 1,
                offset: position.endColumn ?? position.startColumn ?? 0
            }
        };
    }

    const getPanelTitle = () => {
        switch (modelType) {
            case MODEL_TYPE.HTTP_RESOURCE:
                return isNew ? "Select HTTP Method to Add" : "Resource Configuration";
            case MODEL_TYPE.INIT_FUNCTION:
                return isNew ? "Add Initialization Function" : "Initialization Configuration";
            case MODEL_TYPE.MCP_TOOL:
                return isNew ? "Add Tool" : "Tool Configuration";
            case MODEL_TYPE.HANDLER:
                return isNew ? "Add Handler" : "Handler Configuration";
            case MODEL_TYPE.SUB_FUNCTION:
                return isNew ? "Add Function" : "Function Configuration";
            default:
                return "Configuration";
        }
    }

    const getPanelContent = () => {
        if (!functionModel) {
            return null;
        }
        switch (modelType) {
            case MODEL_TYPE.INIT_FUNCTION:
                return (
                    <FunctionForm
                        model={functionModel}
                        filePath={filePath}
                        lineRange={createLineRange(filePath, position)}
                        isSaving={isSaving}
                        onSave={handleFunctionSubmit}
                        onClose={handleCloseSideForm}
                    />
                )
            case MODEL_TYPE.SUB_FUNCTION:
                return (
                    <FunctionForm
                        model={functionModel}
                        filePath={filePath}
                        lineRange={createLineRange(filePath, position)}
                        isSaving={isSaving}
                        onSave={handleFunctionSubmit}
                        onClose={handleCloseSideForm}
                    />
                )
            case MODEL_TYPE.HTTP_RESOURCE:
                return (
                    <ResourceForm
                        isNew={isNew}
                        model={functionModel}
                        isSaving={isSaving}
                        filePath={filePath}
                        onSave={handleFunctionSubmit}
                        onClose={handleCloseSideForm}
                        payloadContext={{
                            protocol: "HTTP",
                            serviceName: serviceModel.name || '',
                            serviceBasePath: serviceModel.properties?.basePath?.value || '',
                        }}
                    />
                )
            case MODEL_TYPE.MCP_TOOL:
                return (

                    <McpToolForm
                        model={functionModel}
                        filePath={filePath}
                        lineRange={createLineRange(filePath, position)}
                        isSaving={isSaving}
                        onSave={handleFunctionSubmit}
                        onClose={handleCloseSideForm}
                    />
                )
            case MODEL_TYPE.HANDLER:
                return (
                    !isHttpService && !isMcpService && canDataBind(functionModel) &&
                    <DatabindForm
                        model={functionModel}
                        isSaving={isSaving}
                        onSave={handleFunctionSubmit}
                        onClose={handleCloseSideForm}
                        isNew={isNew}
                        payloadContext={{
                            protocol: "MESSAGE_BROKER",
                            serviceName: serviceModel.name || '',
                            messageDocumentation: functionModel?.metadata?.description || ''
                        }}
                        serviceProperties={serviceModel.properties}
                        serviceModuleName={serviceModel.moduleName}
                    />
                )
            default:
                return null;
        }
    }

    return (
        <View>
            <TopNavigationBar projectPath={projectPath} />
            {!serviceModel && (
                <LoadingContainer>
                    <LoadingRing message="Loading Service..." />
                </LoadingContainer>
            )}
            {
                serviceModel && (
                    <>
                        <TitleBar
                            title={serviceModel.name}
                            subtitle={"Implement and configure your service"}
                            actions={
                                <>
                                    <Button appearance="secondary" tooltip="Edit Service" onClick={handleServiceEdit}>
                                        <Icon
                                            name="bi-settings"
                                            sx={{
                                                marginRight: 5,
                                                fontSize: "16px",
                                                width: "16px",
                                            }}
                                        /> Configure
                                    </Button>
                                    {
                                        serviceModel && (isHttpService || isMcpService) && (
                                            <>
                                                <Button appearance="secondary" tooltip="Try Service" onClick={handleServiceTryIt}>
                                                    <Icon name="play" isCodicon={true} sx={{ marginRight: 8, fontSize: 16 }} /> <ButtonText>Try It</ButtonText>
                                                </Button>
                                            </>
                                        )
                                    }
                                    {serviceModel && !isMcpService && dropdownOptions.length > 0 && (
                                        <AddServiceElementDropdown
                                            buttonTitle="More"
                                            toolTip="More options"
                                            defaultOption="reusable-function"
                                            onOptionChange={handleMoreOptions}
                                            options={dropdownOptions}
                                        />
                                    )}
                                </>
                            }
                        />

                        <ServiceContainer>
                            {/* Service Metadata - Compact View */}
                            {(listeners.length > 0 || readonlyProperties.size > 0) && (
                                <ServiceMetadataContainer>
                                    <MetadataRow>
                                        {listeners.length > 0 && (
                                            <>
                                                {listeners.map((listener, index) => (
                                                    <PropertyInline key={`${index}-listener`}>
                                                        <Icon name="radio-tower" isCodicon sx={{ fontSize: 12 }} />
                                                        <PropertyKey>Listener:</PropertyKey>
                                                        <PropertyValue>
                                                            {listener.includes(":") ? getReadableListenerName(listener) : listener}
                                                        </PropertyValue>
                                                    </PropertyInline>
                                                ))}
                                            </>
                                        )}
                                        {readonlyProperties.size > 0 && (
                                            <>
                                                {
                                                    Array.from(readonlyProperties).map(prop => (
                                                        <PropertyInline key={prop.label}>
                                                            <PropertyKey>{prop.label}:</PropertyKey>
                                                            <PropertyValue>
                                                                {Array.isArray(prop.value) ? prop.value.join(", ") : removeForwardSlashes(prop.value)}
                                                            </PropertyValue>
                                                        </PropertyInline>
                                                    ))
                                                }
                                            </>
                                        )}
                                    </MetadataRow>
                                </ServiceMetadataContainer>
                            )}

                            {/* Listing Resources in HTTP */}
                            {isHttpService && (
                                <>
                                    <SectionHeader
                                        title="Resources"
                                        subtitle={`${resourcesCount === 0 ? `` : 'Define how the service responds to HTTP requests'}`}
                                    >
                                        <ActionGroup>
                                            {resources.length > 10 && (
                                                <TextField placeholder="Search..." sx={{ width: 200 }} onChange={handleSearch} value={searchValue} />
                                            )}
                                            {!haveServiceTypeName && resourcesCount > 0 && (
                                                <Button appearance="primary" tooltip="Add Resource" onClick={handleNewHTTPResource}>
                                                    <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Resource</ButtonText>
                                                </Button>
                                            )}
                                        </ActionGroup>
                                    </SectionHeader>
                                    {resourcesCount > 0 && (
                                        <FunctionsContainer>
                                            {resources
                                                .filter((resource) => {
                                                    const search = searchValue.toLowerCase();
                                                    const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
                                                    const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
                                                    return nameMatch || iconMatch;
                                                })
                                                .filter((resource) => resource.type === DIRECTORY_MAP.RESOURCE)
                                                .map((resource, index) => (
                                                    <ResourceAccordionV2
                                                        key={`${index}-${resource.name}`}
                                                        resource={resource}
                                                        readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                        onEditResource={handleFunctionEdit}
                                                        onDeleteResource={handleFunctionDelete}
                                                        onResourceImplement={handleOpenDiagram}
                                                    />
                                                ))}
                                        </FunctionsContainer>
                                    )}
                                    {resourcesCount === 0 && (
                                        <EmptyReadmeContainer>
                                            <Description variant="body2">
                                                No resources found. Add a new resource.
                                            </Description>
                                            <Button
                                                appearance="primary"
                                                onClick={handleNewHTTPResource}>
                                                <Codicon name="add" sx={{ marginRight: 5 }} />
                                                Add Resource
                                            </Button>
                                        </EmptyReadmeContainer>
                                    )}
                                </>
                            )}

                            {/* Listing Tools in MCP */}
                            {isMcpService && (
                                <>
                                    <SectionHeader
                                        title="Tools"
                                        subtitle={`${remoteFunctionsCount === 0 ? `` : 'Define how the mcp service responds to tool calls'}`}
                                    >
                                        <ActionGroup>
                                            {resources.length > 10 && (
                                                <TextField placeholder="Search..." sx={{ width: 200 }} onChange={handleSearch} value={searchValue} />
                                            )}
                                            {!haveServiceTypeName && remoteFunctionsCount > 0 && (
                                                <Button appearance="primary" tooltip="Add Tool" onClick={handleNewMcpTool}>
                                                    <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Tool</ButtonText>
                                                </Button>
                                            )}
                                        </ActionGroup>
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {resources
                                            .filter((resource) => {
                                                const search = searchValue.toLowerCase();
                                                const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
                                                const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
                                                return nameMatch || iconMatch;
                                            })
                                            .map((resource, index) => (
                                                <ResourceAccordionV2
                                                    key={`${index}-${resource.name}`}
                                                    resource={resource}
                                                    readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                    onEditResource={handleFunctionEdit}
                                                    onDeleteResource={handleFunctionDelete}
                                                    onResourceImplement={handleOpenDiagram}
                                                    isMcpTool={true}
                                                />
                                            ))}
                                    </FunctionsContainer>

                                    {remoteFunctionsCount === 0 && (
                                        <EmptyReadmeContainer>
                                            <Description variant="body2">
                                                No tools found. Add a new tool.
                                            </Description>
                                            <Button
                                                appearance="primary"
                                                onClick={handleNewMcpTool}>
                                                <Codicon name="add" sx={{ marginRight: 5 }} />
                                                Add Tool
                                            </Button>
                                        </EmptyReadmeContainer>
                                    )}
                                </>
                            )}

                            {/* Listing service type bound functions */}
                            {!(isHttpService || isMcpService) && (
                                <>
                                    <SectionHeader
                                        title="Event Handlers"
                                        subtitle={enabledHandlers.length === 0 ? "" : `Define how the service responds to events`}
                                    >
                                        <ActionGroup>
                                            {enabledHandlers.length !== 0 && unusedHandlers.length > 0 && (
                                                <Button appearance="primary" tooltip="Add Handler" onClick={onSelectAddHandler}>
                                                    <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Handler</ButtonText>
                                                </Button>
                                            )}
                                        </ActionGroup>
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {enabledHandlers.map((functionModel, index) => (
                                            <ResourceAccordion
                                                key={`${index}-${functionModel.name.value}`}
                                                functionModel={functionModel}
                                                goToSource={() => { }}
                                                onEditResource={handleFunctionEdit}
                                                onDeleteResource={handleFunctionDelete}
                                                onResourceImplement={handleOpenDiagram}
                                            />
                                        ))}
                                    </FunctionsContainer>

                                    {enabledHandlers.length === 0 && (
                                        <EmptyReadmeContainer>
                                            <Description variant="body2">
                                                No event handlers found. Add a new event handler.
                                            </Description>
                                            <Button
                                                appearance="primary"
                                                onClick={onSelectAddHandler}>
                                                <Codicon name="add" sx={{ marginRight: 5 }} />
                                                Add Handler
                                            </Button>
                                        </EmptyReadmeContainer>
                                    )}
                                </>
                            )}

                            {/* Listing Initialization Function */}
                            {resources.filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name === "init").length > 0 && (
                                <>
                                    <SectionHeader
                                        title="Initialization Function"
                                        subtitle={`Define the initialization logic for the service`}
                                    >
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {resources
                                            .filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name === "init")
                                            .map((resource, index) => (
                                                <ResourceAccordionV2
                                                    methodName="INIT"
                                                    key={`${index}-${resource.name}`}
                                                    resource={resource}
                                                    readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                    onEditResource={handleFunctionEdit}
                                                    onDeleteResource={handleFunctionDelete}
                                                    onResourceImplement={() => { openInit(resource) }}
                                                />
                                            ))}
                                    </FunctionsContainer>

                                </>
                            )}

                            {/* Listing Sub Functions */}
                            {resources.filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name !== "init").length > 0 && (
                                <>
                                    <SectionHeader
                                        title="Functions"
                                        subtitle="Reusable functions within the service"
                                    >
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {resources
                                            .filter((resource) => {
                                                const search = searchValue.toLowerCase();
                                                const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
                                                const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
                                                return nameMatch || iconMatch;
                                            })
                                            .filter((resource) => resource.type === DIRECTORY_MAP.FUNCTION && resource.name !== "init")
                                            .map((resource, index) => (
                                                <ResourceAccordionV2
                                                    methodName="FUNC"
                                                    key={`${index}-${resource.name}`}
                                                    resource={resource}
                                                    readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                    onEditResource={handleFunctionEdit}
                                                    onDeleteResource={handleFunctionDelete}
                                                    onResourceImplement={handleOpenDiagram}
                                                />
                                            ))}
                                    </FunctionsContainer>
                                </>
                            )}

                            {/* <-------------------- Side panel forms start ---------------- */}
                            <PanelContainer
                                title={getPanelTitle()}
                                show={showForm}
                                onClose={handleCloseSideForm}
                                width={400}
                            >
                                {getPanelContent()}
                            </PanelContainer>

                            {/* This is for adding a new handler to the service */}
                            {serviceModel && !isHttpService && (
                                <PanelContainer
                                    title={"Select Handler to Add"}
                                    show={showFunctionConfigForm}
                                    onClose={handleFunctionConfigClose}
                                >
                                    <FunctionConfigForm
                                        isSaving={isSaving}
                                        serviceModel={serviceModel}
                                        onSubmit={handleFunctionSubmit}
                                        onSelect={onHandlerSelected}
                                        onBack={handleFunctionConfigClose}
                                    />
                                </PanelContainer>
                            )}
                            {/* <-------------------- Side panel forms end ---------------- */}
                        </ServiceContainer>
                    </>
                )
            }
        </View>
    );
}

interface SectionHeaderProps {
    title: string;
    subtitle: string;
    children?: React.ReactNode;
}

function SectionHeader({ title, subtitle, children }: SectionHeaderProps) {
    return (
        <HeaderContainer>
            <div>
                <Typography
                    variant="h3"
                    sx={{ marginLeft: 10, fontWeight: 'bold', marginBottom: 4 }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="body3"
                    sx={{ marginLeft: 10, color: 'var(--vscode-descriptionForeground)', marginBottom: 0 }}
                >
                    {subtitle}
                </Typography>
            </div>
            {children}
        </HeaderContainer>
    );
}
