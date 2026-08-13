import mongoose from "mongoose";
import crypto from "crypto";

const memoryStore = new Map();
const ENTITY_STORE = new Map();

function newId() {
  return new mongoose.Types.ObjectId().toString();
}

function cloneEntity(entity, id) {
  return {
    ...entity,
    _id: entity._id || id || newId(),
    toObject() { return { ...this, _id: this._id?.toString ? this._id.toString() : this._id }; },
  };
}

function cloneJob(data, isNew = false) {
  const id = data._id?.toString ? data._id.toString() : (data._id || newId());
  const now = new Date();
  const base = {
    ...data,
    _id: id,
    userId: data.userId || null,
    isGuest: data.isGuest ?? false,
    status: data.status || "pending",
    originalFilename: data.originalFilename,
    inputFilePath: data.inputFilePath,
    outputFilePath: data.outputFilePath || null,
    policy: data.policy instanceof Map ? data.policy : new Map(Object.entries(data.policy || {})),
    defaultAction: data.defaultAction || "PSEUDONYMIZE",
    entities: Array.isArray(data.entities)
      ? data.entities.map((e, i) => cloneEntity(e, `${id}_ent_${i}`))
      : [],
    evaluation: data.evaluation || null,
    processingStartedAt: data.processingStartedAt || null,
    processingCompletedAt: data.processingCompletedAt || null,
    errorMessage: data.errorMessage || null,
    auditLog: Array.isArray(data.auditLog) ? data.auditLog.map(a => ({
      timestamp: a.timestamp || now,
      actor: a.actor,
      action: a.action,
      detail: a.detail,
    })) : [],
    purgeAt: data.purgeAt || new Date(now.getTime() + 24 * 3600 * 1000),
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    isNew,
    toObject() {
      const entities = (this.entities || []).map(e => ({
        ...e,
        _id: e._id?.toString ? e._id.toString() : e._id,
      }));
      return {
        ...this,
        _id: this._id?.toString ? this._id.toString() : this._id,
        policy: this.policy instanceof Map ? Object.fromEntries(this.policy) : this.policy,
        entities,
        auditLog: this.auditLog || [],
        userId: this.userId?.toString ? this.userId.toString() : this.userId,
      };
    },
    async save() {
      this.updatedAt = new Date();
      this.isNew = false;
      const toStore = this.toObject();
      toStore.policy = new Map(Object.entries(toStore.policy || {}));
      memoryStore.set(this._id.toString(), toStore);
      ENTITY_STORE.set(this._id.toString(), [...(this.entities || [])]);
      return this;
    },
  };
  if (base.entities && base.entities.length > 0) {
    base.entities.id = function (eid) {
      const found = this.find(e => (e._id?.toString ? e._id.toString() : String(e._id)) === String(eid));
      return found || null;
    };
  } else {
    base.entities = base.entities || [];
    base.entities.id = () => null;
  }
  return base;
}

const EntitySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    text: { type: String, required: true },
    textHash: { type: String },
    start: { type: Number },
    end: { type: Number },
    confidence: { type: Number, min: 0, max: 1 },
    source: {
      type: String,
      enum: ["REGEX", "NER", "OCR", "MANUAL"],
      default: "REGEX",
    },
    imageId: { type: String },
    bbox: { x: Number, y: Number, width: Number, height: Number },
    action: {
      type: String,
      enum: ["MASK", "PSEUDONYMIZE", "GENERALIZE", "KEEP", "PENDING_REVIEW"],
      default: "MASK",
    },
    reviewerAction: {
      type: String,
      enum: ["ACCEPTED", "REJECTED", null],
      default: null,
    },
    fakeValueHash: { type: String },
  },
  { _id: true }
);

const EvalResultSchema = new mongoose.Schema(
  {
    entityType: String,
    tp: { type: Number, default: 0 },
    fp: { type: Number, default: 0 },
    fn: { type: Number, default: 0 },
    precision: Number,
    recall: Number,
    f1: Number,
  },
  { _id: false }
);

const JobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.Mixed, ref: "User", default: null },
    isGuest: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "processing", "awaiting_review", "completed", "failed"],
      default: "pending",
      index: true,
    },
    originalFilename: { type: String, required: true },
    inputFilePath: { type: String },
    outputFilePath: { type: String },
    policy: {
      type: Map,
      of: { type: String, enum: ["MASK", "PSEUDONYMIZE", "GENERALIZE"] },
      default: () => new Map(),
    },
    defaultAction: {
      type: String,
      enum: ["MASK", "PSEUDONYMIZE", "GENERALIZE"],
      default: "PSEUDONYMIZE",
    },
    entities: [EntitySchema],
    evaluation: {
      overall: { precision: Number, recall: Number, f1: Number, accuracy: Number },
      byType: [EvalResultSchema],
      imageMetrics: {
        totalImages: { type: Number, default: 0 },
        imagesWithPii: { type: Number, default: 0 },
        regionsRedacted: { type: Number, default: 0 },
      },
    },
    processingStartedAt: Date,
    processingCompletedAt: Date,
    errorMessage: String,
    auditLog: [
      {
        timestamp: { type: Date, default: Date.now },
        actor: String,
        action: String,
        detail: String,
      },
    ],
    purgeAt: Date,
  },
  { timestamps: true }
);

JobSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

const MongooseJob = mongoose.model("Job", JobSchema);

function isMongoConnected() {
  return mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2;
}

function matchQuery(doc, query) {
  if (!query) return true;
  for (const [k, v] of Object.entries(query)) {
    if (k === "_id") {
      const docId = doc._id?.toString ? doc._id.toString() : String(doc._id);
      const qId = v?.toString ? v.toString() : String(v);
      if (docId !== qId) return false;
    } else {
      const docVal = doc[k];
      if (v instanceof RegExp) {
        if (!v.test(String(docVal))) return false;
      } else if (typeof v === "object" && v !== null) {
        const keys = Object.keys(v);
        if (keys.includes("$in")) {
          if (!v.$in.includes(docVal)) return false;
        } else {
          if (JSON.stringify(docVal) !== JSON.stringify(v)) return false;
        }
      } else {
        if (docVal !== v) return false;
      }
    }
  }
  return true;
}

class MemoryQuery {
  constructor(collection, query, options = {}) {
    this.collection = collection;
    this.query = query || {};
    this._sort = null;
    this._skip = 0;
    this._limit = Infinity;
    this._lean = false;
  }
  sort(s) { this._sort = s; return this; }
  skip(n) { this._skip = n; return this; }
  limit(n) { this._limit = n; return this; }
  lean() { this._lean = true; return this; }
  async exec() { return await this.then(); }
  async then(onFulfilled, onRejected) {
    try {
      let docs = [];
      for (const [, doc] of this.collection) {
        if (matchQuery(doc, this.query)) {
          docs.push(doc);
        }
      }
      if (this._sort) {
        const [key, dir] = Object.entries(this._sort)[0] || ["createdAt", -1];
        docs.sort((a, b) => {
          let av = a[key], bv = b[key];
          if (av instanceof Date) av = av.getTime();
          if (bv instanceof Date) bv = bv.getTime();
          if (av < bv) return dir * -1;
          if (av > bv) return dir;
          return 0;
        });
      }
      docs = docs.slice(this._skip, this._skip + this._limit);
      const result = docs.map(d => {
        const cloned = cloneJob({ ...d });
        return this._lean ? cloned.toObject() : cloned;
      });
      if (onFulfilled) return onFulfilled(result);
      return result;
    } catch (e) {
      if (onRejected) return onRejected(e);
      throw e;
    }
  }
  catch(onRejected) { return this.then(undefined, onRejected); }
  finally(cb) { return this.then(v => { cb?.(); return v; }, e => { cb?.(); throw e; }); }
}

async function findMemory(query) {
  const q = new MemoryQuery(memoryStore, query);
  return q;
}

class SingleQuery {
  constructor(executor) {
    this._executor = executor;
    this._lean = false;
  }
  lean() { this._lean = true; return this; }
  maxTimeMS() { return this; }
  select() { return this; }
  then(onFulfilled, onRejected) {
    return this._executor()
      .then(result => {
        if (result && this._lean) {
          if (typeof result.toObject === "function") return result.toObject();
          if (result._doc) return { ...result._doc };
        }
        return result;
      })
      .then(onFulfilled, onRejected);
  }
  catch(onRejected) { return this.then(undefined, onRejected); }
  finally(cb) { return this.then(v => { cb?.(); return v; }, e => { cb?.(); throw e; }); }
}

const JobWrapper = {
  get modelName() { return MongooseJob.modelName; },
  get schema() { return MongooseJob.schema; },

  new(data) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const doc = new MongooseJob(data);
        return doc;
      } catch {}
    }
    return cloneJob(data, true);
  },

  findById(id) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongooseJob.findById(id);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new SingleQuery(async () => {
      const stored = memoryStore.get(id?.toString ? id.toString() : String(id));
      if (!stored) return null;
      return cloneJob(stored, false);
    });
  },

  findOne(query) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongooseJob.findOne(query);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new SingleQuery(async () => {
      for (const [, d] of memoryStore) {
        if (matchQuery(d, query)) return cloneJob(d);
      }
      return null;
    });
  },

  find(query) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try { return MongooseJob.find(query); } catch {}
    }
    return findMemory(query);
  },

  countDocuments(query) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongooseJob.countDocuments(query);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new SingleQuery(async () => {
      let count = 0;
      for (const [, d] of memoryStore) {
        if (matchQuery(d, query)) count++;
      }
      return count;
    });
  },

  findByIdAndUpdate(query, update, options = {}) {
    return this.findOneAndUpdate({ _id: query }, update, options);
  },

  findOneAndUpdate(query, update, options = {}) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongooseJob.findOneAndUpdate(query, update, options);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new SingleQuery(async () => {
      let existing = null;
      let existingKey = null;
      for (const [k, d] of memoryStore) {
        if (matchQuery(d, query)) { existing = d; existingKey = k; break; }
      }
      if (!existing) {
        if (!options.upsert) return null;
        const newDoc = cloneJob({ ...query, ...(typeof update === "object" ? update : {}) }, true);
        await newDoc.save();
        return options.new ? newDoc : newDoc;
      }
      const merged = { ...existing, ...(typeof update === "object" ? update : {}), updatedAt: new Date() };
      memoryStore.set(existingKey, merged);
      const result = cloneJob(merged);
      return options.new ? result : cloneJob(existing);
    });
  },
};

function JobConstructor(data) {
  return JobWrapper.new(data);
}

Object.assign(JobConstructor, JobWrapper);
JobConstructor.prototype = MongooseJob.prototype;

export default JobConstructor;
