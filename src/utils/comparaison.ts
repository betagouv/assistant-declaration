import diff, { Difference } from 'microdiff';

export type DiffState = 'added' | 'removed' | 'updated' | 'unchanged';

export const NUMBER_TOLERANCE: number = 0.0000000000001;

type AddedResult<Model> = {
  state: Extract<DiffState, 'added'>;
  after: Model;
};

type RemovedResult<Model> = {
  state: Extract<DiffState, 'removed'>;
  before: Model;
};

type UpdatedResult<Model, DoNotReportDifferences extends boolean = false> = {
  state: Extract<DiffState, 'updated'>;
  before: Model;
  after: Model;
} & (DoNotReportDifferences extends true ? {} : { differences: Difference[] });

type UnchangedResult<Model> = {
  state: Extract<DiffState, 'unchanged'>;
  model: Model;
};

type SortedModel<Model, ReferenceProperty> = { key: ReferenceProperty; model: Model };
type SortedAddedModel<Model, ReferenceProperty> = { key: ReferenceProperty; afterModel: Model };
type SortedRemovedModel<Model, ReferenceProperty> = { key: ReferenceProperty; beforeModel: Model };
type SortedUpdatedModel<Model, ReferenceProperty> = { key: ReferenceProperty; beforeModel: Model; afterModel: Model };
type SortedUnchangedModel<Model, ReferenceProperty> = { key: ReferenceProperty; model: Model };

export type GetDiffResult<Model, DoNotReportDifferences extends boolean = false> =
  | AddedResult<Model>
  | RemovedResult<Model>
  | UpdatedResult<Model, DoNotReportDifferences>
  | UnchangedResult<Model>;

export type GetDiffResults<ReferenceProperty, Model, DoNotReportDifferences extends boolean = false> = Map<
  ReferenceProperty,
  GetDiffResult<Model, DoNotReportDifferences>
>;

export function getDiff<
  Model extends Record<ReferenceProperty, any>,
  ReferenceProperty extends string | number | symbol,
  DoNotReportDifferences extends boolean = false,
>(
  before: Map<ReferenceProperty, Model>,
  after: Map<ReferenceProperty, Model>,
  options: {
    doNotReportDifferences: DoNotReportDifferences; // May be helpful to save memory on large lists when it's not used
  } = {
    doNotReportDifferences: false as DoNotReportDifferences,
  }
): GetDiffResults<ReferenceProperty, Model, DoNotReportDifferences> {
  const result: GetDiffResults<ReferenceProperty, Model, DoNotReportDifferences> = new Map();

  for (const [afterModelReference, afterModel] of after) {
    const sameBeforeReferenceModel = before.get(afterModelReference);

    let itemResult: GetDiffResult<Model, DoNotReportDifferences>;
    if (sameBeforeReferenceModel) {
      const beforeAfterModelDiff = diff(sameBeforeReferenceModel, afterModel);

      // `microdiff` won't return if unchange, so we can rely on the diff length to detect any change
      if (beforeAfterModelDiff.length > 0) {
        // [WORKAROUND] When comparing 2 objects it happens a float is different between "before" and "after"
        // This happens when reading from a file, from the API, or if the backend has done another operation that changes a bit the rounding
        // So we make sure to ignore those non-significant changes
        let w = beforeAfterModelDiff.length;
        while (w--) {
          const wDiff = beforeAfterModelDiff[w];

          if (
            wDiff.type === 'CHANGE' &&
            typeof wDiff.oldValue === 'number' &&
            typeof wDiff.value === 'number' &&
            Math.abs(wDiff.value - wDiff.oldValue) < NUMBER_TOLERANCE
          ) {
            beforeAfterModelDiff.splice(w, 1);
          }
        }

        // In case the workaround has removes changed, set the object as unchanged
        if (beforeAfterModelDiff.length === 0) {
          itemResult = {
            state: 'unchanged',
            model: afterModel,
          };
        } else {
          itemResult = {
            state: 'updated',
            before: sameBeforeReferenceModel,
            after: afterModel,
            ...(options.doNotReportDifferences === true ? {} : { differences: beforeAfterModelDiff }),
          } as UpdatedResult<Model, DoNotReportDifferences>;
        }
      } else {
        itemResult = {
          state: 'unchanged',
          model: afterModel,
        };
      }
    } else {
      itemResult = {
        state: 'added',
        after: afterModel,
      };
    }

    result.set(afterModelReference, itemResult);
  }

  for (const [beforeModelReference, beforeModel] of before) {
    if (!after.has(beforeModelReference)) {
      result.set(beforeModelReference, {
        state: 'removed',
        before: beforeModel,
      });
    }
  }

  return result;
}

export function getDiffCounts<ReferenceProperty, Model, DoNotReportDifferences extends boolean = false>(
  result: GetDiffResults<ReferenceProperty, Model | SortedModel<Model, ReferenceProperty>, DoNotReportDifferences>
) {
  const counts = {
    added: 0,
    removed: 0,
    updated: 0,
    unchanged: 0,
  };

  for (const [, item] of result) {
    switch (item.state) {
      case 'added':
        counts.added += 1;
        break;
      case 'removed':
        counts.removed += 1;
        break;
      case 'updated':
        counts.updated += 1;
        break;
      case 'unchanged':
        counts.unchanged += 1;
        break;
    }
  }

  return counts;
}

export function sortDiffWithKeysAndStates<ReferenceProperty, Model, DoNotReportDifferences extends boolean = false>(
  result: GetDiffResults<ReferenceProperty, Model, DoNotReportDifferences>
) {
  const sortedResult = {
    added: [] as SortedAddedModel<Model, ReferenceProperty>[],
    removed: [] as SortedRemovedModel<Model, ReferenceProperty>[],
    updated: [] as SortedUpdatedModel<Model, ReferenceProperty>[],
    unchanged: [] as SortedUnchangedModel<Model, ReferenceProperty>[],
  };

  for (const [key, item] of result) {
    switch (item.state) {
      case 'added':
        sortedResult.added.push({ key: key, afterModel: item.after });
        break;
      case 'removed':
        sortedResult.removed.push({ key: key, beforeModel: item.before });
        break;
      case 'updated':
        sortedResult.updated.push({ key: key, beforeModel: item.before, afterModel: item.after });
        break;
      case 'unchanged':
        sortedResult.unchanged.push({ key: key, model: item.model });
        break;
    }
  }

  return sortedResult;
}

export function sortDiffWithKeys<ReferenceProperty, Model, DoNotReportDifferences extends boolean = false>(
  result: GetDiffResults<ReferenceProperty, Model, DoNotReportDifferences>
) {
  const sortedResultWithStates = sortDiffWithKeysAndStates(result);

  return {
    added: sortedResultWithStates.added.map((item) => ({ key: item.key, model: item.afterModel })),
    removed: sortedResultWithStates.removed.map((item) => ({ key: item.key, model: item.beforeModel })),
    updated: sortedResultWithStates.updated.map((item) => ({ key: item.key, model: item.afterModel })),
    unchanged: sortedResultWithStates.unchanged.map((item) => ({ key: item.key, model: item.model })),
  };
}

export function sortDiff<ReferenceProperty, Model, DoNotReportDifferences extends boolean = false>(
  result: GetDiffResults<ReferenceProperty, Model, DoNotReportDifferences>
) {
  const sortedResult = sortDiffWithKeys(result);

  return {
    added: sortedResult.added.map((wrapper) => wrapper.model),
    removed: sortedResult.removed.map((wrapper) => wrapper.model),
    updated: sortedResult.updated.map((wrapper) => wrapper.model),
    unchanged: sortedResult.unchanged.map((wrapper) => wrapper.model),
  };
}

export function formatDiffResultLog<ReferenceProperty, Model, DoNotReportDifferences extends boolean = false>(
  result: GetDiffResults<ReferenceProperty, Model | SortedModel<Model, ReferenceProperty>, DoNotReportDifferences>
) {
  const counts = getDiffCounts(result);

  return `added: ${counts.added} | removed: ${counts.removed} | updated: ${counts.updated} | unchanged: ${counts.unchanged}`;
}
