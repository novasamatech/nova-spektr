import { Link } from 'react-router-dom';

const TestRoute = () => {
  return (
    <>
      <div>Test route</div>
      <Link to="/main" className="bg-green-300">
        go to main
      </Link>
    </>
  );
};

export default TestRoute;
