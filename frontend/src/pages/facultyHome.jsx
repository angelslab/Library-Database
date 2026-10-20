function FacultyHome({ user }) {
  return (
    <div>
      <h2>Faculty Dashboard</h2>

      <section>
        <h3>My information</h3>
        <p>Faculty ID: {user.facultyID}</p>
        <p>Email: {user.email}</p>
        <p>Department: {user.department}</p>
      </section>
    </div>
  );
}

export default FacultyHome;
