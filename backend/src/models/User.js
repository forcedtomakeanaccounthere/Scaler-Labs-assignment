import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userMemoryStore = new Map();
const emailIndex = new Map();

function newId() {
  return new mongoose.Types.ObjectId().toString();
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      required: function () { return !this.googleId; },
    },
    googleId: { type: String, sparse: true },
    avatar: { type: String, default: "" },
    company: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) { next(error); }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

const MongooseUser = mongoose.model("User", userSchema);

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
      if (typeof v === "string" && typeof docVal === "string") {
        if (k === "email") {
          if (docVal.toLowerCase() !== v.toLowerCase()) return false;
        } else if (docVal !== v) return false;
      } else if (docVal !== v) return false;
    }
  }
  return true;
}

function cloneUser(data) {
  const now = new Date();
  const base = {
    ...data,
    _id: data._id || newId(),
    name: data.name,
    email: typeof data.email === "string" ? data.email.toLowerCase() : data.email,
    password: data.password || undefined,
    googleId: data.googleId || undefined,
    avatar: data.avatar || "",
    company: data.company || "",
    role: data.role || "user",
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    __password: data.password,
    async save() {
      this.updatedAt = new Date();
      if (this.password && (!this.__password || this.__password !== this.password)) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }
      const toStore = { ...this };
      delete toStore.__password;
      delete toStore.comparePassword;
      delete toStore.toJSON;
      delete toStore.save;
      userMemoryStore.set(this._id.toString(), { ...toStore, password: this.password });
      if (this.email) emailIndex.set(this.email.toLowerCase(), this._id.toString());
      return this;
    },
    toObject() {
      const obj = { ...this };
      delete obj.__password;
      delete obj.comparePassword;
      delete obj.save;
      delete obj.toJSON;
      return {
        ...obj,
        _id: obj._id?.toString ? obj._id.toString() : obj._id,
      };
    },
    toJSON() {
      const obj = this.toObject ? this.toObject() : { ...this };
      delete obj.password;
      return obj;
    },
    async comparePassword(candidate) {
      if (!this.password) return false;
      try {
        return await bcrypt.compare(candidate, this.password);
      } catch {
        return false;
      }
    },
  };
  return base;
}

class UserSingleQuery {
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
          if (typeof result.toObject === "function") {
            const o = result.toObject();
            delete o.password;
            return o;
          }
          if (result._doc) {
            const o = { ...result._doc };
            delete o.password;
            return o;
          }
          const o = { ...result };
          delete o.password;
          return o;
        }
        return result;
      })
      .then(onFulfilled, onRejected);
  }
  catch(onRejected) { return this.then(undefined, onRejected); }
  finally(cb) { return this.then(v => { cb?.(); return v; }, e => { cb?.(); throw e; }); }
}

const Wrapper = {
  get modelName() { return MongooseUser.modelName; },
  get schema() { return MongooseUser.schema; },

  new(data) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try { return new MongooseUser(data); } catch {}
    }
    return cloneUser(data);
  },

  findOne(query) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongooseUser.findOne(query);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new UserSingleQuery(async () => {
      if (query?.email != null) {
        const id = emailIndex.get(String(query.email).toLowerCase());
        if (id) {
          const stored = userMemoryStore.get(id);
          if (stored) return cloneUser(stored);
        }
      }
      for (const [, d] of userMemoryStore) {
        if (matchQuery(d, query)) return cloneUser(d);
      }
      return null;
    });
  },

  findById(id) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongooseUser.findById(id);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new UserSingleQuery(async () => {
      const stored = userMemoryStore.get(id?.toString ? id.toString() : String(id));
      if (!stored) return null;
      return cloneUser(stored);
    });
  },

  findOneAndUpdate(query, update, options = {}) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        const q = MongooseUser.findOneAndUpdate(query, update, options);
        const origMax = q.maxTimeMS?.bind(q);
        if (origMax) try { origMax(3000); } catch {}
        return q;
      } catch {}
    }
    return new UserSingleQuery(async () => {
      let existing = null;
      let existingKey = null;
      if (query?.email != null) {
        const id = emailIndex.get(String(query.email).toLowerCase());
        if (id) {
          existing = userMemoryStore.get(id);
          existingKey = id;
        }
      }
      if (!existing) {
        for (const [k, d] of userMemoryStore) {
          if (matchQuery(d, query)) { existing = d; existingKey = k; break; }
        }
      }
      if (!existing) {
        if (!options.upsert) return null;
        const data = { ...query, ...(typeof update === "object" ? update : {}) };
        const doc = cloneUser(data);
        await doc.save();
        return options.new ? doc : doc;
      }
      const merged = { ...existing, ...(typeof update === "object" ? update : {}), updatedAt: new Date() };
      userMemoryStore.set(existingKey, merged);
      if (merged.email) emailIndex.set(merged.email.toLowerCase(), existingKey);
      const result = cloneUser(merged);
      return options.new ? result : cloneUser(existing);
    });
  },

  deleteOne(query) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        return MongooseUser.deleteOne(query);
      } catch {}
    }
    return new UserSingleQuery(async () => {
      let existingKey = null;
      if (query?.email != null) {
        const id = emailIndex.get(String(query.email).toLowerCase());
        if (id) {
          existingKey = id;
        }
      }
      if (!existingKey) {
        for (const [k, d] of userMemoryStore) {
          if (matchQuery(d, query)) { existingKey = k; break; }
        }
      }
      let deletedCount = 0;
      if (existingKey) {
        const stored = userMemoryStore.get(existingKey);
        if (stored?.email) {
          const lower = stored.email.toLowerCase();
          if (emailIndex.get(lower) === existingKey) emailIndex.delete(lower);
        }
        if (userMemoryStore.delete(existingKey)) deletedCount = 1;
      }
      return { deletedCount, acknowledged: true };
    });
  },

  deleteMany(query) {
    const hasMongo = isMongoConnected();
    if (hasMongo) {
      try {
        return MongooseUser.deleteMany(query);
      } catch {}
    }
    return new UserSingleQuery(async () => {
      let deletedCount = 0;
      for (const [k, d] of [...userMemoryStore.entries()]) {
        if (!query || matchQuery(d, query)) {
          if (d?.email) {
            const lower = d.email.toLowerCase();
            if (emailIndex.get(lower) === k) emailIndex.delete(lower);
          }
          if (userMemoryStore.delete(k)) deletedCount++;
        }
      }
      return { deletedCount, acknowledged: true };
    });
  },
};

function UserConstructor(data) { return Wrapper.new(data); }
Object.assign(UserConstructor, Wrapper);
UserConstructor.prototype = MongooseUser.prototype;

export default UserConstructor;
