import {
    DashboardFilterRule,
    FilterableField,
    FilterOperator,
    FilterRule,
    FilterType,
    getFilterRuleWithDefaultValue,
    getFilterTypeFromItem,
} from '@lightdash/common';
import {
    PopoverProps,
    Select,
    Stack,
    Switch,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    FilterInputComponent,
    getFilterOperatorOptions,
} from '../../common/Filters/FilterInputs';
import { getPlaceholderByFilterTypeAndOperator } from '../../common/Filters/utils/getPlaceholderByFilterTypeAndOperator';

interface FilterSettingsProps {
    isEditMode: boolean;
    isCreatingNew: boolean;
    field: FilterableField;
    filterRule: DashboardFilterRule;
    popoverProps?: Omit<PopoverProps, 'children'>;
    onChangeFilterRule: (value: DashboardFilterRule) => void;
}

const FilterSettings: FC<FilterSettingsProps> = ({
    isEditMode,
    isCreatingNew,
    field,
    filterRule,
    popoverProps,
    onChangeFilterRule,
}) => {
    const [filterLabel, setFilterLabel] = useState<string>();

    const filterType = useMemo(() => {
        return field ? getFilterTypeFromItem(field) : FilterType.STRING;
    }, [field]);

    const filterOperatorOptions = useMemo(
        () => getFilterOperatorOptions(filterType),
        [filterType],
    );

    // Set default label when using revert (undo) button
    useEffect(() => {
        if (filterLabel !== '') {
            setFilterLabel(filterRule.label ?? field.label);
        }
    }, [filterLabel, filterRule.label, field.label]);

    const handleChangeFilterOperator = (operator: FilterRule['operator']) => {
        onChangeFilterRule(
            getFilterRuleWithDefaultValue(field, {
                ...filterRule,
                operator,
            }),
        );
    };

    const isFilterDisabled = !!filterRule.disabled;

    const showValueInput = useMemo(() => {
        // Always show the input in view mode
        if (!isEditMode) {
            return true;
        }
        // In edit mode, only don't show input when disabled
        if (isFilterDisabled) {
            return false;
        }
        return true;
    }, [isFilterDisabled, isEditMode]);

    const showAnyValueDisabledInput = useMemo(() => {
        return (
            isFilterDisabled &&
            isEditMode &&
            ![FilterOperator.NULL, FilterOperator.NOT_NULL].includes(
                filterRule.operator,
            )
        );
    }, [filterRule.operator, isFilterDisabled, isEditMode]);

    return (
        <Stack>
            <Stack spacing="xs">
                {isEditMode && (
                    <TextInput
                        label="Filter label"
                        mb="sm"
                        size="xs"
                        onChange={(e) => {
                            setFilterLabel(e.target.value);
                            onChangeFilterRule({
                                ...filterRule,
                                label: e.target.value || undefined,
                            });
                        }}
                        placeholder={`Label for ${field.label}`}
                        value={filterLabel}
                    />
                )}
                {isCreatingNew && !isEditMode && (
                    <Text size="xs" fw={500}>
                        Value
                    </Text>
                )}
                <Select
                    size="xs"
                    data={filterOperatorOptions}
                    withinPortal={popoverProps?.withinPortal}
                    onDropdownOpen={popoverProps?.onOpen}
                    onDropdownClose={popoverProps?.onClose}
                    onChange={handleChangeFilterOperator}
                    value={filterRule.operator}
                />
                {showAnyValueDisabledInput && (
                    <TextInput
                        disabled
                        size="xs"
                        placeholder={getPlaceholderByFilterTypeAndOperator({
                            type: filterType,
                            operator: filterRule.operator,
                            disabled: true,
                        })}
                    />
                )}
                {showValueInput && (
                    <FilterInputComponent
                        popoverProps={popoverProps}
                        filterType={filterType}
                        field={field}
                        rule={filterRule}
                        onChange={(newFilterRule) =>
                            onChangeFilterRule(
                                newFilterRule as DashboardFilterRule,
                            )
                        }
                    />
                )}
                {isEditMode && (
                    <Tooltip
                        withinPortal
                        position="right"
                        label={
                            isFilterDisabled
                                ? 'Toggle on to set a default filter value'
                                : 'Toggle off to leave the filter value empty, allowing users to populate it in view mode'
                        }
                        openDelay={500}
                    >
                        <div style={{ width: 'max-content' }}>
                            <Switch
                                label={
                                    <Text size="xs" mt="two" fw={500}>
                                        Provide default value
                                    </Text>
                                }
                                labelPosition="right"
                                checked={!isFilterDisabled}
                                onChange={(e) => {
                                    const newFilter: DashboardFilterRule = {
                                        ...filterRule,
                                        disabled: !e.currentTarget.checked,
                                    };

                                    onChangeFilterRule(
                                        e.currentTarget.checked
                                            ? newFilter
                                            : getFilterRuleWithDefaultValue(
                                                  field,
                                                  newFilter,
                                                  null,
                                              ),
                                    );
                                }}
                            />
                        </div>
                    </Tooltip>
                )}
            </Stack>
        </Stack>
    );
};

export default FilterSettings;
