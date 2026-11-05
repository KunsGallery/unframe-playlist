import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="up-listening-page">
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p>주소가 바뀌었거나 더 이상 공개되지 않는 페이지입니다.</p>
      <Link to="/">음악 목록으로</Link>
    </section>
  );
}
