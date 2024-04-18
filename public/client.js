/**
 * @template [T=any]
 * @typedef {object} DraxEvent
 * @property {number} id
 * @property {string} created
 * @property {string} name
 * @property {string} visitor
 * @property {T} payload
 */

export class DraxClient {
  /** @param {string|URL} baseUrl */
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * @param {string|URL} input
   * @param {RequestInit} init
   */
  async fetchJson(input, init = undefined) {
    const res = await fetch(new URL(input, this.baseUrl), init);
    if (!res.ok) throw new Error("DraxClient failed: " + res.statusText);
    return res.json();
  }

  /** @returns {Promise<{ message: 'ok', meta: { name: string, version: string } }>} */
  info() {
    return this.fetchJson("api");
  }

  /** @returns {Promise<'ok'>} */
  healthz() {
    return this.fetchJson("healthz");
  }

  /**
   * @template {{ visitor: string }} T
   * @param {string} name
   * @param {T} event
   * @returns {Promise<DraxEvent<Omit<T, 'visitor'>>}
   */
  createEvent(name, event) {
    return this.fetchJson(`api/events/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  }

  /** @returns {Promise<{ name: string, count: string }>} */
  listTypes() {
    return this.fetchJson(`api/types`);
  }

  /**
   * @param {string} name
   * @returns {Promise<DraxEvent[]>}
   */
  typedEvents(name) {
    return this.fetchJson(`api/events/${name}`);
  }

  /** @returns {Promise<{ name: string, count: string }>} */
  listVisitors() {
    return this.fetchJson(`api/visitors`);
  }

  /**
   * @param {string} visitor
   * @returns {Promise<DraxEvent[]>}
   */
  visitorEvents(visitor) {
    return this.fetchJson(`api/visitors/${visitor}`);
  }

  /** @returns {Promise<{ id:string }>} */
  createVisitor() {
    return this.fetchJson("visitor", { method: "POST" });
  }

  /** @returns {Promise<{ events: number, visitors: string[], types: string[] }>} */
  meta() {
    return this.fetchJson("/api/meta");
  }
}
