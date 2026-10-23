     import Login from "./Login";
   import StudentDashboard from "./StudentDashboard";

   export default function App() {
     return localStorage.getItem("token") ? <StudentDashboard /> : <Login />;
   }