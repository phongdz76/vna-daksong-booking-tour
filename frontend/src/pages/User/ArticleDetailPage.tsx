import { useParams } from "react-router-dom";
import Header from "../../components/layout/Header";
import Photo from "../../components/common/Photo";
import { ErrorState, LoadingState } from "../../components/common/States";
import useApi from "../../hooks/useApi";
import {
  previewArticle,
  type ArticleContent,
} from "../../context/NotificationContext";

export default function ArticleDetailPage() {
  const { id } = useParams();
  const result = useApi<ArticleContent>(
    `/articles/${id}`,
    id === previewArticle._id ? previewArticle : undefined,
  );
  return (
    <div className="page article-detail-page">
      <Header title="Bài viết" back fallback="/explore" />
      {result.loading ? (
        <LoadingState />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.retry} />
      ) : (
        result.data && (
          <>
            {result.data.images?.[0] && (
              <Photo
                className="article-cover"
                src={result.data.images[0].url}
                alt={result.data.images[0].alt || result.data.title}
                eager
              />
            )}
            <article className="article-content">
              <span className="eyebrow">CẨM NANG ĐẮK SONG</span>
              <h1>{result.data.title}</h1>
              <p className="article-summary">{result.data.summary}</p>
              <div className="article-body">{result.data.content}</div>
            </article>
          </>
        )
      )}
    </div>
  );
}
