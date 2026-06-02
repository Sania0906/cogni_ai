import dotenv from "dotenv";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

dotenv.config();

async function seed() {
  if (!isSupabaseConfigured()) {
    console.error("Supabase credentials are not configured in environment variables. Seeding aborted.");
    process.exit(1);
  }

  try {
    console.log("Seeding initial catalog data into Supabase...");

    // Clear existing courses (delete all rows)
    const { error: clearCoursesErr } = await supabaseAdmin
      .from("courses")
      .delete()
      .neq("title", "");
      
    if (clearCoursesErr) {
      console.warn("Could not clear courses table:", clearCoursesErr.message);
    } else {
      console.log("Cleared existing courses catalog.");
    }

    // Clear existing jobs (delete all rows)
    const { error: clearJobsErr } = await supabaseAdmin
      .from("jobs")
      .delete()
      .neq("company", "");
      
    if (clearJobsErr) {
      console.warn("Could not clear jobs table:", clearJobsErr.message);
    } else {
      console.log("Cleared existing jobs catalog.");
    }

    // Insert Courses (maintaining course_1, course_2 custom IDs for UI mapping)
    const courses = [
      { id: "course_1", title: "Advanced Machine Learning", author: "Dr. Sarah Johnson", tags: ["Advanced", "Data Science"], weeks: 8, rating: 4.8, students: "12.5k" },
      { id: "course_2", title: "Deep Learning Foundations", author: "Prof. Mike Chen", tags: ["Intermediate", "AI/ML"], weeks: 6, rating: 4.7, students: "9.2k" },
      { id: "course_3", title: "Python for Data Science", author: "Anna Lee", tags: ["Beginner", "Programming"], weeks: 4, rating: 4.9, students: "20.1k" },
      { id: "course_4", title: "MLOps: Deploying Models to Production", author: "Jane Dev", tags: ["Intermediate", "Systems"], weeks: 5, rating: 4.6, students: "5.4k" }
    ];

    const { data: seededCourses, error: courseErr } = await supabaseAdmin
      .from("courses")
      .insert(courses)
      .select();

    if (courseErr) {
      throw new Error(`Failed to seed courses: ${courseErr.message}`);
    }
    console.log(`Successfully seeded ${seededCourses.length} courses.`);

    // Insert Jobs (maintaining job_1, job_2 custom IDs for UI mapping)
    const jobs = [
      { id: "job_1", title: "Senior Data Scientist", company: "TechCorp", loc: "San Francisco, CA", type: "Full-time", salary: "$140k - $180k", match: 95, requirements: ["Python", "Machine Learning", "SQL"] },
      { id: "job_2", title: "ML Engineer", company: "AIVision", loc: "Remote", type: "Full-time", salary: "$130k - $170k", match: 91, requirements: ["Python", "PyTorch", "TensorFlow"] },
      { id: "job_3", title: "AI Research Scientist", company: "NeuralLabs", loc: "New York, NY", type: "Full-time", salary: "$160k - $220k", match: 88, requirements: ["Deep Learning", "Transformers", "Math"] },
      { id: "job_4", title: "MLOps Engineer", company: "SystemsInc", loc: "Remote", type: "Full-time", salary: "$120k - $155k", match: 72, requirements: ["Docker", "MLflow", "FastAPI"] }
    ];

    const { data: seededJobs, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .insert(jobs)
      .select();

    if (jobErr) {
      throw new Error(`Failed to seed jobs: ${jobErr.message}`);
    }
    console.log(`Successfully seeded ${seededJobs.length} jobs.`);

    console.log("Supabase Database Seeding Completed Successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Exception:", error);
    process.exit(1);
  }
}

seed();
