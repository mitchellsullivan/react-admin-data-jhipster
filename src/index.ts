import {DataProvider, fetchUtils} from 'ra-core';
import {stringify} from "querystring";
import {omitBy} from "lodash";
import {
  CreateParams,
  DeleteManyParams,
  DeleteParams,
  GetListParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  UpdateManyParams,
  UpdateParams
} from "react-admin";

/**
 * Maps react-admin queries to JHipster-generated, filtered REST endpoints.
 *
 * @example
 * GET_LIST             => GET /posts?page=0&size=10&sort=id,DESC
 * GET_ONE              => GET /posts/123
 * GET_MANY             => GET /posts?id.in=1,2,3,4
 * GET_MANY_REFERENCE   => GET /comments?post.equals=123&page=0&size=10&sort=id,ASC
 * CREATE               => POST /posts
 * UPDATE (Partial)     => PATCH /posts/123
 * UPDATE_MANY (Full)   => (Multiple) PUT /posts/123
 * DELETE               => DELETE /posts/123
 * DELETE_MANY          => (Multiple) DELETE /posts/123
 */

const composeFilterForStringify = (filter: Record<string, any> = {}): Record<string, any> =>
  Object.keys(filter)
    .reduce(
      (acc, key) => ({...acc, [`${key}.equals`]: filter[key]}),
      {}
    );

const jhiProvider = (apiUrl: string, httpClient = fetchUtils.fetchJson): DataProvider => ({
  // sort, filter, pagination
  async getList(resource: string, { filter, sort, pagination }: GetListParams) {
    try {
      const q = stringify({
        ...composeFilterForStringify(filter),
        page: pagination.page - 1,
        size: pagination.perPage,
        sort: `${sort.field},${sort.order}`
      });
      const res = await httpClient(`${apiUrl}/${resource}?${q}`, {
        method: 'GET',
        headers: new Headers({
          'Accept': 'application/json'
        })
      });
      return {
        data: res?.json || [],
        total: +(res.headers?.get('X-Total-Count') || 0)
      };
    } catch (e) {
      throw new Error(e.body.detail)
    }
  },

  // only one param `id` in GetOneParams
  async getOne(resource: string, {id}: GetOneParams) {
    try {
      const res = await httpClient(`${apiUrl}/${resource}/${id}`, {
        method: 'GET',
        headers: new Headers({
          'Accept': 'application/json'
        })
      });
      return {
        data: res?.json
      };
    } catch (e) {
      throw new Error(e.body.detail)
    }
  },

  // only one param `ids` GetManyParams
  async getMany(resource: string, {ids}: GetManyParams) {
    try {
      const idParams = "id.in=" + ids.join(',');
      const res = await httpClient(`${apiUrl}/${resource}?${idParams}`, {
        method: 'GET',
        headers: new Headers({
          'Accept': 'application/json'
        })
      });
      return {
        data: res?.json
      };
    } catch (e) {
      throw new Error(e.body.detail)
    }
  },

  // target, id, pagination, sort, filter
  async getManyReference(resource: string, {filter, pagination, sort, target, id}: GetManyReferenceParams) {
    try {
      const q = stringify({
        [`${target}.equals`]: id,
        ...composeFilterForStringify(filter),
        page: pagination.page - 1,
        size: pagination.perPage,
        sort: `${sort.field},${sort.order}`
      });
      const url = `${apiUrl}/${resource}?${q}`;
      const res = await httpClient(url, {
        method: 'GET',
        headers: new Headers({
          'Accept': 'application/json'
        })
      });
      return {
        data: res?.json || [],
        total: +(res.headers?.get('X-Total-Count') || 0)
      };
    } catch (e) {
      throw new Error(e.body.detail)
    }
  },

  async update(resource: string, {id, data, previousData}: UpdateParams) {
    try {
      const changedData = omitBy(data, (v, k) => previousData[k] === v);
      const res = await httpClient(`${apiUrl}/${resource}/${id}`, {
        method: 'PATCH',
        headers: new Headers({
          'Accept': 'application/json',
          'Content-Type': 'application/merge-patch+json',
        }),
        body: JSON.stringify({
          ...changedData,
          id
        }),
      });
      return {
        data: res?.json
      }
    } catch (e) {
      throw new Error(e.body.detail)
    }
  },

  async updateMany(resource: string, {data, ids}: UpdateManyParams) {
    try {
      const responses = await Promise.all(
        ids.map((id) =>
          httpClient(`${apiUrl}/${resource}/${id}`, {
            method: 'PUT',
            headers: new Headers({
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify(data),
          }),
        ),
      )
      return {
        data: responses.map(({json}) => json),
      }
    } catch (e) {
      throw new Error(e.body.detail)
    }
  },

  async create(resource: string, {data}: CreateParams) {
    try {
      const res = await httpClient(`${apiUrl}/${resource}`, {
        method: 'POST',
        headers: new Headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(data),
      });
      return {
        data: {
          ...data,
          id: res?.json?.id
        },
      }
    } catch (e) {
      throw new Error(e.body.detail)
    }
  },

  async delete(resource: string, {id}: DeleteParams) {
    try {
      const res = await httpClient(`${apiUrl}/${resource}/${id}`, {
        method: 'DELETE',
        headers: new Headers({
          'Accept': 'application/json',
        }),
      });
      return {
        data: {
          ...(res?.json || {}),
          id
        }
      }
    } catch (e) {
      throw new Error(e.body.detail);
    }
  },

  async deleteMany(resource: string, {ids}: DeleteManyParams) {
    try {
      const responses = await Promise.all(
        ids.map((id) =>
          httpClient(`${apiUrl}/${resource}/${id}`, {
            method: 'DELETE',
            headers: new Headers({
              'Accept': 'application/json',
            }),
          }),
        )
      );
      return {
        data: responses.map((res) => res?.json)
      }
    } catch (e) {
      throw new Error(e.body.detail)
    }
  },
});

export default jhiProvider;
