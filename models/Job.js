const mongoose = require('mongoose');
const { Schema } = mongoose;

const jobSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  applicants: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    },
  ],
  postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Admin who created the job
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
