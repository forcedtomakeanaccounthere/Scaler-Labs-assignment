import mongoose from "mongoose";

const pseudoMemoryStore = new Map();

function newId() {
  return new mongoose.Types.ObjectId().toString();
}

const PseudoMapSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    entityType: { type: String, required: true },
    originalHash: { type: String, required: true },
    fakeValue: { type: String, required: true },
  },
  { timestamps: true }
);

PseudoMapSchema.index({ jobId: 1, originalHash: 1 }, { unique: true });

const MongoosePseudoMap = mongoose.model("PseudoMap", PseudoMapSchema);

function isMongoConnected() {
  return mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2;
}

function matchQuery(doc, query) {
  if (!query) return true;
  for (const [k, v] of Object.entries(query)) {
    if (k === "jobId" || k === "_id") {
      const docVal = doc[k]?.toString ? doc[k].toString() : String(doc[k]);
      const qVal = v?.toString ? v.toString() : String(v);
      if (docVal !== qVal) return false;
    } else {
      if (doc[k] !== v) return false;
    }
  }
  return true;
}

function clonePseudo(data) {
  const now = new Date();
  return {
    ...data,
    _id: data._id || newId(),
    jobId: data.jobId,
    entityType: data.entityType,
    originalHash: data.originalHash,
    fakeValue: data.fakeValue,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    async save() {
      this.updatedAt = new Date();
      pseudoMemoryStore.set(this._id.toString(), { ...this });
      const key = `${this.jobId?.toString() || String(this.jobId)}::${this.originalHash}`;
      pseudoMemoryStore.set(`compound::${key}`, { ...this });
      return this;
    },
    toObject() {
      return {
        ...this,
        _id: this._id?.toString ? this._id.toString() : this._id,
        jobId: this.jobId?.toString ? this.jobId.toString() : this.jobId,
      };
    },
  };
}

class PseudoSingleQuery {
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

const Wrapper = {
  get modelName() { return MongoosePseudoMap.modelName; },
  get schema() { return MongoosePseudoMap.schema; },

  new(data) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try { return new MongoosePseudoMap(data); } catch {}
    }
    return clonePseudo(data);
  },

  findOne(query) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongoosePseudoMap.findOne(query);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new PseudoSingleQuery(async () => {
      if (query?.jobId != null && query?.originalHash != null) {
        const key = `${query.jobId?.toString() || String(query.jobId)}::${query.originalHash}`;
        const cached = pseudoMemoryStore.get(`compound::${key}`);
        if (cached) return clonePseudo(cached);
      }
      for (const [, d] of pseudoMemoryStore) {
        if (matchQuery(d, query)) return clonePseudo(d);
      }
      return null;
    });
  },

  findOneAndUpdate(query, update, options = {}) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongoosePseudoMap.findOneAndUpdate(query, update, options);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new PseudoSingleQuery(async () => {
      let existing = null;
      if (query?.jobId != null && query?.originalHash != null) {
        const key = `${query.jobId?.toString() || String(query.jobId)}::${query.originalHash}`;
        existing = pseudoMemoryStore.get(`compound::${key}`);
      }
      if (!existing) {
        for (const [, d] of pseudoMemoryStore) {
          if (matchQuery(d, query)) { existing = d; break; }
        }
      }
      if (!existing) {
        if (!options.upsert) return null;
        const data = { ...query, ...(typeof update === "object" ? update : {}) };
        const doc = clonePseudo(data);
        await doc.save();
        return options.new ? doc : doc;
      }
      const merged = { ...existing, ...(typeof update === "object" ? update : {}), updatedAt: new Date() };
      pseudoMemoryStore.set(existing._id.toString(), merged);
      if (merged.jobId != null && merged.originalHash != null) {
        const key = `${merged.jobId?.toString() || String(merged.jobId)}::${merged.originalHash}`;
        pseudoMemoryStore.set(`compound::${key}`, merged);
      }
      const result = clonePseudo(merged);
      return options.new ? result : clonePseudo(existing);
    });
  },
};

function PseudoConstructor(data) { return Wrapper.new(data); }
Object.assign(PseudoConstructor, Wrapper);
PseudoConstructor.prototype = MongoosePseudoMap.prototype;

export default PseudoConstructor;
