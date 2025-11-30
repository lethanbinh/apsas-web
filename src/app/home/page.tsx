import { Metadata } from "next";
import Image from "next/image";
import { Layout } from "@/components/layout/Layout";

export const metadata: Metadata = {
  title: "Home - APSAS Web",
  description: "Programming Assessment is now effortless",
};

export default function HomePage() {
  return (
    <Layout>
      <section className="bg-white">
        <div className="hero-section-bg">
          <div className="hero-section-content-container">
            <div className="hero-section-grid">
              <div className="hero-text-content">
                <h1 className="hero-title">
                  <span className="text-orange">Programming</span>
                  <br />
                  <span className="text-orange">Assessment</span>
                  <span className="text-white"> is</span>
                  <br className="text-white" />
                  now effortless.
                </h1>
                <p className="hero-description">
                  Effortless coding assessment for instructors, instant feedback
                  for students.
                </p>
              </div>

              <div className="hero-image-wrapper">
                <div className="hero-image-inner-wrapper">
                  <Image
                    src="/images/beautiful-female-student-showing-v-sign-smiling-happy-holding-notebooks-with-study-material-attendin.webp"
                    alt="Smiling student holding notebooks"
                    width={1152}
                    height={768}
                    className="hero-image"
                    priority
                    unoptimized
                  />

                  {/* Floating badges */}
                  <div className="hero-badge-top-left">
                    <div className="hero-badge-item">
                      <div className="hero-badge-icon-wrapper">📅</div>
                      <div className="hero-badge-text-content">
                        <div className="hero-badge-title">250k</div>
                        <div className="hero-badge-subtitle">
                          Assisted Student
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hero-badge-middle-left">
                    <div className="hero-badge-icon-large">📩</div>
                  </div>

                  <div className="hero-badge-middle-right">
                    <div className="hero-badge-card-small">
                      <div className="hero-badge-card-title">
                        Congratulations
                      </div>
                      <div className="hero-badge-card-subtitle">
                        Your admission completed
                      </div>
                    </div>
                  </div>

                  <div className="hero-badge-bottom">
                    <div className="hero-badge-long-card">
                      <div className="hero-badge-avatar" />
                      <div className="hero-badge-long-card-text-content">
                        <div className="hero-badge-long-card-title">SangNM</div>
                        <div className="hero-badge-long-card-subtitle">
                          Today at 12.00 PM
                        </div>
                      </div>
                      <button className="hero-badge-join-button">
                        Join Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative bottom curve */}
          <div className="decorative-bottom-curve">
            <svg
              viewBox="0 0 1440 120"
              className="w-full h-[120px] -mb-[1px]"
              preserveAspectRatio="none"
            >
              <path d="M0,96L1440,32L1440,160L0,160Z" fill="#cde8fb" />
            </svg>
          </div>
        </div>
      </section>

      {/* New Section: Our Success */}
      <section className="our-success-section">
        <div className="our-success-container">
          <h2 className="our-success-title">Our Success</h2>

          {/* Statistics Grid */}
          <div className="our-success-stats-grid">
            <div className="our-success-stat-item">
              <div className="our-success-stat-number">15K+</div>
              <div className="our-success-stat-label">Students</div>
            </div>
            <div className="our-success-stat-item">
              <div className="our-success-stat-number">75</div>
              <div className="our-success-stat-label">Total success</div>
            </div>
            <div className="our-success-stat-item">
              <div className="our-success-stat-number">50</div>
              <div className="our-success-stat-label">Courses</div>
            </div>
            <div className="our-success-stat-item">
              <div className="our-success-stat-number">150</div>
              <div className="our-success-stat-label">Classes</div>
            </div>
          </div>

          {/* Description Section */}
          <div className="our-success-description-section">
            <h3 className="our-success-description-title">
              Programming Assessment{" "}
              <span className="our-success-description-highlight">
                Software.
              </span>
            </h3>
            <p className="our-success-description-text">
              APSAS is an innovative platform that helps instructors easily
              assess programming skills and provide instant feedback to
              students.
            </p>
          </div>
        </div>
      </section>

      {/* New Section: Three Feature Cards */}
      <section className="feature-cards-section">
        <div className="feature-cards-container">
          {/* Card 1 */}
          <div className="feature-card">
            <div className="feature-card-icon-wrapper feature-card-icon-wrapper-1">
              <span className="feature-card-icon feature-card-icon-1">📄</span>{" "}
              {/* Placeholder icon for document */}
            </div>
            <h3 className="feature-card-title">
              Automate the assessment
              <br />
              process
            </h3>
            <p className="feature-card-description">
              by integrating static code analysis, dynamic code execution, and
              test case evaluation through APIs such as Judge0 or Piston.
            </p>
          </div>

          {/* Card 2 */}
          <div className="feature-card">
            <div className="feature-card-icon-wrapper feature-card-icon-wrapper-2">
              <span className="feature-card-icon feature-card-icon-2">📅</span>{" "}
              {/* Placeholder icon for calendar */}
            </div>
            <h3 className="feature-card-title">
              Provide immediate
              <br />
              and informative feedback
            </h3>
            <p className="feature-card-description">
              by using AI-powered feedback generation (e.g., via GPT/OpenAI),
              helping students quickly understand their mistakes and improve.
            </p>
          </div>

          {/* Card 3 */}
          <div className="feature-card">
            <div className="feature-card-icon-wrapper feature-card-icon-wrapper-3">
              <span className="feature-card-icon feature-card-icon-3">👥</span>{" "}
              {/* Placeholder icon for users */}
            </div>
            <h3 className="feature-card-title">
              Support student
              <br />
              learning and skill progression
            </h3>
            <p className="feature-card-description">
              with dashboards showing progress over time, upcoming assignments,
              and access to learning resources and tutorials.
            </p>
          </div>
        </div>
      </section>

      {/* New Section: What is APSAS? */}
      <section className="py-20 bg-white">
        <div className="what-is-apsas-container">
          <h2 className="what-is-apsas-title">
            What is <span className="what-is-apsas-highlight">APSAS?</span>
          </h2>
          <p className="what-is-apsas-description">
            APSAS aims to provide an advanced solution leveraging modern
            technologies to automate code evaluation, skill assessment, and
            personalized feedback, enhancing learning experiences for students
            and reducing instructors' workload.
          </p>
        </div>
      </section>

      {/* New Section: Two Image Cards */}
      <section className="image-cards-section">
        <div className="image-cards-container">
          {/* Image Card 1: For Instructors */}
          <div className="image-card">
            <Image
              src="https://www.hypeinnovation.com/hs-fs/hubfs/thisisengineering-raeng-TXxiFuQLBKQ-unsplash%20(1).jpg?width=837&height=558&name=thisisengineering-raeng-TXxiFuQLBKQ-unsplash%20(1).jpg"
              alt="For Instructors"
              width={500}
              height={300}
              className="image-card-img"
              style={{ width: "100%", height: "auto" }}
            />
            <div className="image-card-overlay-text">FOR INSTRUCTORS</div>
          </div>

          {/* Image Card 2: For Students */}
          <div className="image-card">
            <Image
              src="https://study.com/cimages/multimages/16/group_project4152137855063887692.jpg"
              alt="For Students"
              width={500}
              height={300}
              className="image-card-img"
              style={{ width: "100%", height: "auto" }}
            />
            <div className="image-card-overlay-text">FOR STUDENTS</div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
