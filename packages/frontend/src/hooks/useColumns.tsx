import { Icon } from '@blueprintjs/core';
import { Tooltip2 } from '@blueprintjs/popover2';
import {
    AdditionalMetric,
    CustomDimension,
    Field,
    formatItemValue,
    friendlyName,
    getItemMap,
    isAdditionalMetric,
    isCustomDimension,
    isDimension,
    isField,
    isNumericItem,
    itemsInMetricQuery,
    ItemsMap,
    TableCalculation,
} from '@lightdash/common';
import { useMemo } from 'react';
import {
    TableHeaderBoldLabel,
    TableHeaderLabelContainer,
    TableHeaderRegularLabel,
} from '../components/common/Table/Table.styles';
import { columnHelper, TableColumn } from '../components/common/Table/types';
import { useExplorerContext } from '../providers/ExplorerProvider';
import { useCalculateTotal } from './useCalculateTotal';
import { useExplore } from './useExplore';

export const getItemBgColor = (
    item: Field | AdditionalMetric | TableCalculation | CustomDimension,
): string => {
    if (isCustomDimension(item)) return '#d2dbe9';
    if (isField(item) || isAdditionalMetric(item)) {
        return isDimension(item) ? '#d2dbe9' : '#e4dad0';
    } else {
        return '#d2dfd7';
    }
};

export const useColumns = (): TableColumn[] => {
    const activeFields = useExplorerContext(
        (context) => context.state.activeFields,
    );
    const tableName = useExplorerContext(
        (context) => context.state.unsavedChartVersion.tableName,
    );
    const tableCalculations = useExplorerContext(
        (context) =>
            context.state.unsavedChartVersion.metricQuery.tableCalculations,
    );
    const customDimensions = useExplorerContext(
        (context) =>
            context.state.unsavedChartVersion.metricQuery.customDimensions,
    );
    const additionalMetrics = useExplorerContext(
        (context) =>
            context.state.unsavedChartVersion.metricQuery.additionalMetrics,
    );
    const sorts = useExplorerContext(
        (context) => context.state.unsavedChartVersion.metricQuery.sorts,
    );
    const resultsData = useExplorerContext(
        (context) => context.queryResults.data,
    );

    const { data: exploreData } = useExplore(tableName, {
        refetchOnMount: false,
    });

    const { activeItemsMap, invalidActiveItems } = useMemo<{
        activeItemsMap: ItemsMap;
        invalidActiveItems: string[];
    }>(() => {
        if (exploreData) {
            const allItemsMap = getItemMap(
                exploreData,
                additionalMetrics,
                tableCalculations,
                customDimensions,
            );

            return Array.from(activeFields).reduce<{
                activeItemsMap: ItemsMap;
                invalidActiveItems: string[];
            }>(
                (acc, key) => {
                    return allItemsMap[key]
                        ? {
                              ...acc,
                              activeItemsMap: {
                                  ...acc.activeItemsMap,
                                  [key]: allItemsMap[key],
                              },
                          }
                        : {
                              ...acc,
                              invalidActiveItems: [
                                  ...acc.invalidActiveItems,
                                  key,
                              ],
                          };
                },
                { activeItemsMap: {}, invalidActiveItems: [] },
            );
        }
        return { activeItemsMap: {}, invalidActiveItems: [] };
    }, [
        additionalMetrics,
        exploreData,
        tableCalculations,
        activeFields,
        customDimensions,
    ]);

    const { data: totals } = useCalculateTotal({
        metricQuery: resultsData?.metricQuery,
        explore: exploreData?.baseTable,
        fieldIds: resultsData
            ? itemsInMetricQuery(resultsData.metricQuery)
            : undefined,
        itemsMap: activeItemsMap,
    });

    return useMemo(() => {
        const validColumns = Object.entries(activeItemsMap).reduce<
            TableColumn[]
        >((acc, [fieldId, item]) => {
            const hasJoins = (exploreData?.joinedTables || []).length > 0;

            const sortIndex = sorts.findIndex((sf) => fieldId === sf.fieldId);
            const isFieldSorted = sortIndex !== -1;
            const column: TableColumn = columnHelper.accessor(
                (row) => row[fieldId],
                {
                    id: fieldId,
                    header: () => (
                        <TableHeaderLabelContainer>
                            {isField(item) ? (
                                <>
                                    {hasJoins && (
                                        <TableHeaderRegularLabel>
                                            {item.tableLabel}{' '}
                                        </TableHeaderRegularLabel>
                                    )}

                                    <TableHeaderBoldLabel>
                                        {item.label}
                                    </TableHeaderBoldLabel>
                                </>
                            ) : (
                                <TableHeaderBoldLabel>
                                    {('displayName' in item &&
                                        item.displayName) ||
                                        friendlyName(item.name)}
                                </TableHeaderBoldLabel>
                            )}
                        </TableHeaderLabelContainer>
                    ),
                    cell: (info) => info.getValue()?.value.formatted || '-',
                    footer: () =>
                        totals?.[fieldId]
                            ? formatItemValue(item, totals[fieldId])
                            : null,
                    meta: {
                        item,
                        draggable: true,
                        frozen: false,
                        bgColor: getItemBgColor(item),
                        sort: isFieldSorted
                            ? {
                                  sortIndex,
                                  sort: sorts[sortIndex],
                                  isMultiSort: sorts.length > 1,
                                  isNumeric: isNumericItem(item),
                              }
                            : undefined,
                    },
                },
            );
            return [...acc, column];
        }, []);

        const invalidColumns = invalidActiveItems.reduce<TableColumn[]>(
            (acc, fieldId) => {
                const column: TableColumn = columnHelper.accessor(
                    (row) => row[fieldId],
                    {
                        id: fieldId,
                        header: () => (
                            <TableHeaderLabelContainer>
                                <Tooltip2
                                    content="This field was not found in the dbt project."
                                    position="top"
                                >
                                    <Icon
                                        icon="warning-sign"
                                        intent="warning"
                                    />
                                </Tooltip2>

                                <TableHeaderBoldLabel
                                    style={{ marginLeft: 10 }}
                                >
                                    {fieldId}
                                </TableHeaderBoldLabel>
                            </TableHeaderLabelContainer>
                        ),
                        cell: (info) => info.getValue()?.value.formatted || '-',
                        meta: {
                            isInvalidItem: true,
                        },
                    },
                );
                return [...acc, column];
            },
            [],
        );
        return [...validColumns, ...invalidColumns];
    }, [activeItemsMap, invalidActiveItems, sorts, totals, exploreData]);
};
