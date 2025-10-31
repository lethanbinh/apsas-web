import { Metadata } from 'next';
import Image from 'next/image';
import { Layout } from '@/components/layout/Layout';

export const metadata: Metadata = {
  title: 'Home - APSAS Web',
  description: 'Programming Assessment is now effortless',
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
                  Effortless coding assessment for instructors, instant feedback for students.
                </p>
                <div className="hero-button-wrapper">
                  <button className="hero-button">
                    Join class
                  </button>
                </div>
              </div>

              <div className="hero-image-wrapper">
                <div className="hero-image-inner-wrapper">
                  <Image
                    src="https://png.pngtree.com/png-vector/20250121/ourmid/pngtree-a-cheerful-young-student-with-long-wavy-brown-hair-png-image_15291628.png"
                    alt="Hero Illustration"
                    width={700}
                    height={600}
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
                        <div className="hero-badge-subtitle">Assisted Student</div>
                      </div>
                    </div>
                  </div>

                  <div className="hero-badge-middle-left">
                    <div className="hero-badge-icon-large">📩</div>
                  </div>

                  <div className="hero-badge-middle-right">
                    <div className="hero-badge-card-small">
                      <div className="hero-badge-card-title">Congratulations</div>
                      <div className="hero-badge-card-subtitle">Your admission completed</div>
                    </div>
                  </div>

                  <div className="hero-badge-bottom">
                    <div className="hero-badge-long-card">
                      <div className="hero-badge-avatar" />
                      <div className="hero-badge-long-card-text-content">
                        <div className="hero-badge-long-card-title">SangNM</div>
                        <div className="hero-badge-long-card-subtitle">Today at 12.00 PM</div>
                      </div>
                      <button className="hero-badge-join-button">Join Now</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative bottom curve */}
          <div className="decorative-bottom-curve">
            <svg viewBox="0 0 1440 120" className="w-full h-[120px] -mb-[1px]" preserveAspectRatio="none">
              <path d="M0,96L1440,32L1440,160L0,160Z" fill="#cde8fb" />
            </svg>
          </div>
        </div>
      </section>

      {/* New Section: Our Success */}
      <section className="our-success-section">
        <div className="our-success-container">
          <h2 className="our-success-title">
            Our Success
          </h2>

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
              Programming Assessment <span className="our-success-description-highlight">Software.</span>
            </h3>
            <p className="our-success-description-text">
              APSAS is an innovative platform that helps instructors easily assess
              programming skills and provide instant feedback to students.
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
                <span className="feature-card-icon feature-card-icon-1">📄</span> {/* Placeholder icon for document */}
              </div>
              <h3 className="feature-card-title">
                Automate the assessment
                <br />process
              </h3>
              <p className="feature-card-description">
                by integrating static code analysis, dynamic code execution, and test case
                evaluation through APIs such as Judge0 or Piston.
              </p>
            </div>

            {/* Card 2 */}
            <div className="feature-card">
              <div className="feature-card-icon-wrapper feature-card-icon-wrapper-2">
                <span className="feature-card-icon feature-card-icon-2">📅</span> {/* Placeholder icon for calendar */}
              </div>
              <h3 className="feature-card-title">
                Provide immediate
                <br />and informative feedback
              </h3>
              <p className="feature-card-description">
                by using AI-powered feedback generation (e.g., via GPT/OpenAI),
                helping students quickly understand their mistakes and improve.
              </p>
            </div>

            {/* Card 3 */}
            <div className="feature-card">
              <div className="feature-card-icon-wrapper feature-card-icon-wrapper-3">
                <span className="feature-card-icon feature-card-icon-3">👥</span> {/* Placeholder icon for users */}
              </div>
              <h3 className="feature-card-title">
                Support student
                <br />learning and skill progression
              </h3>
              <p className="feature-card-description">
                with dashboards showing progress over time,
                upcoming assignments, and access to learning resources
                and tutorials.
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
            APSAS aims to provide an advanced solution leveraging modern technologies to
            automate code evaluation, skill assessment, and personalized feedback, enhancing
            learning experiences for students and reducing instructors' workload.
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
            />
            <div className="image-card-overlay-text">FOR STUDENTS</div>
          </div>
        </div>
      </section>

      {/* New Section: Course Category */}
      <section className="course-category-section">
        <div className="course-category-container">
          <h2 className="course-category-title">Course category</h2>
          <div className="course-cards-scroll-container">
            {/* Course Card 1: UX/UI */}
            <div className="course-card-item">
              <Image
                src="https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQU0rqvN9g4QXCHoAHrV4iPSmmhBgMmg_-2ugz-doTVwIvCBKs3"
                alt="UX/UI Course"
                width={280}
                height={180}
              />
              <div className="course-card-overlay-text">UX/UI</div>
            </div>

            {/* Course Card 2: React */}
            <div className="course-card-item">
              <Image
                src="https://drivinginnovation.ie.edu/wp-content/uploads/elementor/thumbs/remote-work-qotklakpbp56woad6e2ko81wcge70gqx29nz6o78ay.jpg"
                alt="React Course"
                width={280}
                height={180}
              />
              <div className="course-card-overlay-text">React</div>
            </div>

            {/* Course Card 3: PHP */}
            <div className="course-card-item">
              <Image
                src="https://qdrant.tech/img/customers-case-studies/case-study-image1.png"
                alt="PHP Course"
                width={280}
                height={180}
              />
              <div className="course-card-overlay-text">PHP</div>
            </div>

            {/* Course Card 4: Another example (you can add more) */}
            <div className="course-card-item">
              <Image
                src="https://thanhdo.edu.vn/wp-content/uploads/2025/07/nganh-thiet-ke-game-3.jpg"
                alt="C++ Course"
                width={280}
                height={180}
              />
              <div className="course-card-overlay-text">C++</div>
            </div>
            
            <div className="course-card-item">
              <Image
                src="https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQU0rqvN9g4QXCHoAHrV4iPSmmhBgMmg_-2ugz-doTVwIvCBKs3"
                alt="UX/UI Course"
                width={280}
                height={180}
              />
              <div className="course-card-overlay-text">UX/UI</div>
            </div>

            {/* Course Card 2: React */}
            <div className="course-card-item">
              <Image
                src="https://drivinginnovation.ie.edu/wp-content/uploads/elementor/thumbs/remote-work-qotklakpbp56woad6e2ko81wcge70gqx29nz6o78ay.jpg"
                alt="React Course"
                width={280}
                height={180}
              />
              <div className="course-card-overlay-text">React</div>
            </div>

            {/* Course Card 3: PHP */}
            <div className="course-card-item">
              <Image
                src="https://qdrant.tech/img/customers-case-studies/case-study-image1.png"
                alt="PHP Course"
                width={280}
                height={180}
              />
              <div className="course-card-overlay-text">PHP</div>
            </div>

            {/* Course Card 4: Another example (you can add more) */}
            <div className="course-card-item">
              <Image
                src="https://thanhdo.edu.vn/wp-content/uploads/2025/07/nganh-thiet-ke-game-3.jpg"
                alt="C++ Course"
                width={280}
                height={180}
              />
              <div className="course-card-overlay-text">C++</div>
            </div>

          </div>
        </div>
      </section>

      {/* New Section: My Courses */}
      <section className="my-courses-section">
        <div className="my-courses-container">
          <h2 className="my-courses-title">My Courses</h2>
          <div className="my-courses-grid">
            {/* Course Card 1 */}
            <div className="my-course-card">
              <Image
                src="https://www.edutech.com/uploads/images/6206484947dac.png"
                alt="Mobile Programming"
                width={400}
                height={250}
                className="my-course-card-image"
              />
              <div className="my-course-card-content">
                <h3 className="my-course-card-title">Class SE1720 - Mobile Programing</h3>
                <div className="my-course-card-instructor">
                  <Image
                    src="https://www.gravatar.com/avatar/d2c7d99fe281ecd3f6894c03a88f1d7d0?s=250"
                    alt="Instructor Avatar"
                    width={32}
                    height={32}
                    className="my-course-card-avatar"
                  />
                  <span className="my-course-card-instructor-name">SangNM</span>
                </div>
                <p className="my-course-card-description">
                  Class, launched less than a year ago by Blackboard co-founder Michael Chasen,
                  integrates exclusively...
                </p>
                <div className="my-course-card-actions">
                  <button className="my-course-card-view-button">View</button>
                </div>
              </div>
            </div>

            {/* Course Card 2 (with updated content) */}
            <div className="my-course-card">
              <Image
                src="https://www.edutech.com/uploads/images/6206484947dac.png"
                alt="Web Development"
                width={400}
                height={250}
                className="my-course-card-image"
              />
              <div className="my-course-card-content">
                <h3 className="my-course-card-title">Class FN1010 - Web Development</h3>
                <div className="my-course-card-instructor">
                  <Image
                    src="https://www.gravatar.com/avatar/d2c7d99fe281ecd3f6894c03a88f1d7d0?s=250"
                    alt="Instructor Avatar"
                    width={32}
                    height={32}
                    className="my-course-card-avatar"
                  />
                  <span className="my-course-card-instructor-name">Jane Doe</span>
                </div>
                <p className="my-course-card-description">
                  This course covers the fundamentals of web development, including HTML, CSS, JavaScript, and modern frameworks.
                </p>
                <div className="my-course-card-actions">
                  <button className="my-course-card-view-button">View</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </Layout>
  );
}


