function StudentHome({ user }) {
  return (
    <div>
      <h2>Student Dashboard</h2>

      <section>
        <h3>My information</h3>
        <p>Student ID: {user.studentID}</p>
        <p>Email: {user.email}</p>
        <p>Major: {user.major}</p>
      </section>
    </div>
  );
}

export default StudentHome;
