import {
  IQueryConfig,
  IQueryParams,
  IQueryResult,
  PrismaCountArgs,
  PrismaFindManyArgs,
  PrismaModelDelegate,
  PrismaNumberFilter,
  PrismaStringFilter,
  PrismaWhereConditions,
} from "../interfaces/query.interface";

/**
 * Generic Prisma Query Builder
 * Supports search, filter, sort, pagination, select fields, and include relations
 *
 * @template T - Model type
 * @template TWhereInput - Type for additional where conditions
 * @template TInclude - Type for include relations
 */
export class QueryBuilder<
  T,
  TWhereInput = Record<string, unknown>,
  TInclude = Record<string, unknown>,
> {
  private query: PrismaFindManyArgs;
  private countQuery: PrismaCountArgs;
  private page: number = 1;
  private limit: number = 10;
  private skip: number = 0;
  private sortBy: string = "createdAt";
  private sortOrder: "asc" | "desc" = "desc";
  private selectFields: Record<string, boolean> | undefined;

  /**
   * Constructor
   * @param model - Prisma model delegate
   * @param queryParams - Request query parameters
   * @param config - Optional configuration for searchable and filterable fields
   */
  constructor(
    private model: PrismaModelDelegate,
    private queryParams: IQueryParams,
    private config: IQueryConfig = {},
  ) {
    // Initialize query and countQuery objects
    this.query = {
      where: {},
      include: {},
      orderBy: {},
      skip: 0,
      take: 10,
    };

    this.countQuery = {
      where: {},
    };
  }

  /**
   * Apply search functionality
   * Supports nested fields (e.g., relation.field or relation.subRelation.field)
   */
  search(): this {
    const { searchTerm } = this.queryParams;
    const { searchableFields } = this.config;
    // Example of searchable fields for a model, including nested relations:
    // ['user.name', 'user.email', 'posts.title', 'posts.content']
    if (searchTerm && searchableFields && searchableFields.length > 0) {
      const searchConditions: Record<string, unknown>[] = searchableFields.map(
        (field) => {
          if (field.includes(".")) {
            const parts = field.split(".");
            // Handle relation.field
            if (parts.length === 2) {
              const [relation, nestedField] = parts as [string, string];

              const stringFilter: PrismaStringFilter = {
                contains: searchTerm,
                mode: "insensitive" as const,
              };

              return {
                [relation]: {
                  [nestedField]: stringFilter,
                },
              };
            }
            // Handle relation.subRelation.field
            else if (parts.length === 3) {
              const [relation, nestedRelation, nestedField] = parts as [
                string,
                string,
                string,
              ];

              const stringFilter: PrismaStringFilter = {
                contains: searchTerm,
                mode: "insensitive" as const,
              };

              return {
                [relation]: {
                  some: {
                    [nestedRelation]: {
                      [nestedField]: stringFilter,
                    },
                  },
                },
              };
            }
          }
          // Direct field search
          const stringFilter: PrismaStringFilter = {
            contains: searchTerm,
            mode: "insensitive" as const,
          };

          return {
            [field]: stringFilter,
          };
        },
      );

      const whereConditions = this.query.where as PrismaWhereConditions;

      whereConditions.OR = searchConditions;

      const countWhereConditions = this.countQuery
        .where as PrismaWhereConditions;
      countWhereConditions.OR = searchConditions;
    }

    return this;
  }
  /**
   * Apply filter functionality
   * Supports nested fields and range filters (lt, lte, gt, gte, in, notIn, etc.)
   */
  filter(): this {
    const { filterableFields } = this.config;
    const excludedField = [
      "searchTerm",
      "page",
      "limit",
      "sortBy",
      "sortOrder",
      "fields",
      "include",
    ];

    // Collect filterable query parameters
    const filterParams: Record<string, unknown> = {};

    Object.keys(this.queryParams).forEach((key) => {
      if (!excludedField.includes(key)) {
        filterParams[key] = this.queryParams[key];
      }
    });

    const queryWhere = this.query.where as Record<string, unknown>;
    const countQueryWhere = this.countQuery.where as Record<string, unknown>;
    // Apply each filter parameter
    Object.keys(filterParams).forEach((key) => {
      const value = filterParams[key];

      if (value === undefined || value === "") {
        return;
      }

      const isAllowedField =
        !filterableFields ||
        filterableFields.length === 0 ||
        filterableFields.includes(key);

      // Handle nested fields in queries, e.g., relation.field or relation.subRelation.field
      // Example filterable fields: ['category.name', 'price']
      // Query params: /model?price[lt]=100&price[gt]=50 => { price: { lt: 100, gt: 50 } }
      // Nested relation example: /model?user.name=John => { user: { name: 'John' } }
      if (key.includes(".")) {
        const parts = key.split(".");

        if (filterableFields && !filterableFields.includes(key)) {
          return;
        }
        // relation.field
        if (parts.length === 2) {
          const [relation, nestedField] = parts as [string, string];

          if (!queryWhere[relation]) {
            queryWhere[relation] = {};
            countQueryWhere[relation] = {};
          }

          const queryRelation = queryWhere[relation] as Record<string, unknown>;
          const countRelation = countQueryWhere[relation] as Record<
            string,
            unknown
          >;

          queryRelation[nestedField] = this.parseFilterValue(value);
          countRelation[nestedField] = this.parseFilterValue(value);
          return;
        }
        // relation.subRelation.field
        else if (parts.length === 3) {
          const [relation, nestedRelation, nestedField] = parts as [
            string,
            string,
            string,
          ];

          if (!queryWhere[relation]) {
            queryWhere[relation] = {
              some: {},
            };
            countQueryWhere[relation] = {
              some: {},
            };
          }

          const queryRelation = queryWhere[relation] as Record<string, unknown>;
          const countRelation = countQueryWhere[relation] as Record<
            string,
            unknown
          >;

          if (!queryRelation.some) {
            queryRelation.some = {};
          }
          if (!countRelation.some) {
            countRelation.some = {};
          }

          const querySome = queryRelation.some as Record<string, unknown>;
          const countSome = countRelation.some as Record<string, unknown>;

          if (!querySome[nestedRelation]) {
            querySome[nestedRelation] = {};
          }

          if (!countSome[nestedRelation]) {
            countSome[nestedRelation] = {};
          }

          const queryNestedRelation = querySome[nestedRelation] as Record<
            string,
            unknown
          >;
          const countNestedRelation = countSome[nestedRelation] as Record<
            string,
            unknown
          >;

          queryNestedRelation[nestedField] = this.parseFilterValue(value);
          countNestedRelation[nestedField] = this.parseFilterValue(value);

          return;
        }
      }

      if (!isAllowedField) {
        return;
      }

      // Range filter parsing
      // Range filter like { lt: 10, gt: 5 }
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        queryWhere[key] = this.parseRangeFilter(
          value as Record<string, string | number>,
        );
        countQueryWhere[key] = this.parseRangeFilter(
          value as Record<string, string | number>,
        );
        return;
      }

      //direct value parsing
      queryWhere[key] = this.parseFilterValue(value);
      countQueryWhere[key] = this.parseFilterValue(value);
    });
    return this;
  }
  /**
   * Apply pagination
   * Default: page=1, limit=10
   */
  paginate(): this {
    const page = Number(this.queryParams.page) || 1;
    const limit = Number(this.queryParams.limit) || 10;

    this.page = page;
    this.limit = limit;
    this.skip = (page - 1) * limit;

    this.query.skip = this.skip;
    this.query.take = this.limit;

    return this;
  }

  /**
   * Apply sorting
   * Supports nested fields like relation.field
   */
  sort(): this {
    const sortBy = this.queryParams.sortBy || "createdAt";
    const sortOrder = this.queryParams.sortOrder === "asc" ? "asc" : "desc";

    this.sortBy = sortBy;
    this.sortOrder = sortOrder;

    // Handle sorting by nested fields, e.g., relation.field or relation.subRelation.field
    // Example query: /model?sortBy=user.name&sortOrder=asc => orderBy: { user: { name: 'asc' } }

    if (sortBy.includes(".")) {
      const parts = sortBy.split(".");

      if (parts.length === 2) {
        const [relation, nestedField] = parts as [string, string];

        this.query.orderBy = {
          [relation]: {
            [nestedField]: sortOrder,
          },
        };
      } else if (parts.length === 3) {
        const [relation, nestedRelation, nestedField] = parts as [
          string,
          string,
          string,
        ];

        this.query.orderBy = {
          [relation]: {
            [nestedRelation]: {
              [nestedField]: sortOrder,
            },
          },
        };
      } else {
        this.query.orderBy = {
          [sortBy]: sortOrder,
        };
      }
    } else {
      this.query.orderBy = {
        [sortBy]: sortOrder,
      };
    }
    return this;
  }

  /**
   * Select specific fields
   * Only direct fields supported for now
   */
  fields(): this {
    const fieldsParam = this.queryParams.fields;
    // Handle field selection for API responses
    // Example query: /model?fields=id,name,relation => select only the specified fields
    // Note: Currently supports only direct fields; nested field selection is not handled
    if (fieldsParam && typeof fieldsParam === "string") {
      const fieldsArray = fieldsParam?.split(",").map((field) => field.trim());
      this.selectFields = {};

      fieldsArray?.forEach((field) => {
        if (this.selectFields) {
          this.selectFields[field] = true;
        }
      });

      this.query.select = this.selectFields as Record<
        string,
        boolean | Record<string, unknown>
      >;

      delete this.query.include; // prevent conflict with include
    }
    return this;
  }

  /**
   * Include relations
   * Ignored if select fields is already applied
   */
  include(relation: TInclude): this {
    if (this.selectFields) {
      return this;
    }

    //if fields method is, include method will be ignored to prevent conflict between select and include
    this.query.include = {
      ...(this.query.include as Record<string, unknown>),
      ...(relation as Record<string, unknown>),
    };

    return this;
  }

  /**
   * Dynamic include
   * Apply default include and query param include
   */
  dynamicInclude(
    includeConfig: Record<string, unknown>,
    defaultInclude?: string[],
  ): this {
    if (this.selectFields) {
      return this;
    }

    const result: Record<string, unknown> = {};

    defaultInclude?.forEach((field) => {
      if (includeConfig[field]) {
        result[field] = includeConfig[field];
      }
    });

    const includeParam = this.queryParams.include as string | undefined;

    if (includeParam && typeof includeParam === "string") {
      const requestedRelations = includeParam
        .split(",")
        .map((relation) => relation.trim());

      requestedRelations.forEach((relation) => {
        if (includeConfig[relation]) {
          result[relation] = includeConfig[relation];
        }
      });
    }

    this.query.include = {
      ...(this.query.include as Record<string, unknown>),
      ...result,
    };

    return this;
  }

  /**
   * Merge additional where conditions
   */
  where(condition: TWhereInput): this {
    this.query.where = this.deepMerge(
      this.query.where as Record<string, unknown>,
      condition as Record<string, unknown>,
    );

    this.countQuery.where = this.deepMerge(
      this.countQuery.where as Record<string, unknown>,
      condition as Record<string, unknown>,
    );

    return this;
  }

  /**
   * Execute query and return data with meta
   */
  async execute(): Promise<IQueryResult<T>> {
    const [total, data] = await Promise.all([
      this.model.count(
        this.countQuery as Parameters<typeof this.model.count>[0],
      ),
      this.model.findMany(
        this.query as Parameters<typeof this.model.findMany>[0],
      ),
    ]);

    const totalPages = Math.ceil(total / this.limit);

    return {
      data: data as T[],
      meta: {
        page: this.page,
        limit: this.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Return count only
   */
  async count(): Promise<number> {
    return await this.model.count(
      this.countQuery as Parameters<typeof this.model.count>[0],
    );
  }

  /**
   * Get raw Prisma findMany query object
   */
  getQuery(): PrismaFindManyArgs {
    return this.query;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (
          result[key] &&
          typeof result[key] === "object" &&
          !Array.isArray(result[key])
        ) {
          result[key] = this.deepMerge(
            result[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>,
          );
        } else {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Parse individual filter value
   */
  private parseFilterValue(value: unknown): unknown {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }

    if (typeof value === "string" && !isNaN(Number(value)) && value != "") {
      return Number(value);
    }

    if (Array.isArray(value)) {
      return { in: value.map((item) => this.parseFilterValue(item)) };
    }

    return value;
  }

  /**
   * Parse range filter like { lt, lte, gt, gte, in, notIn, contains }
   */
  private parseRangeFilter(
    value: Record<string, string | number>,
  ): PrismaNumberFilter | PrismaStringFilter | Record<string, unknown> {
    const rangeQuery: Record<string, string | number | (string | number)[]> =
      {};

    Object.keys(value).forEach((operator) => {
      const operatorValue = value[operator];

      const parsedValue: string | number =
        typeof operatorValue === "string" && !isNaN(Number(operatorValue))
          ? Number(operatorValue)
          : (operatorValue ?? "");

      switch (operator) {
        case "lt":
        case "lte":
        case "gt":
        case "gte":
        case "equals":
        case "not":
        case "contains":
        case "startsWith":
        case "endsWith":
          rangeQuery[operator] = parsedValue;
          break;

        case "in":
        case "notIn":
          if (Array.isArray(operatorValue)) {
            rangeQuery[operator] = operatorValue;
          } else {
            rangeQuery[operator] = [parsedValue];
          }
          break;
        default:
          break;
      }
    });

    return Object.keys(rangeQuery).length > 0 ? rangeQuery : value;
  }
}
