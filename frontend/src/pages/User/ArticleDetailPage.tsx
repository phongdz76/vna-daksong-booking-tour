import { useParams } from "react-router-dom";
import Header from "../../components/layout/Header";
import Photo from "../../components/common/Photo";
import ImageGallery from "../../components/common/ImageGallery";
import { ErrorState, LoadingState } from "../../components/common/States";
import useApi from "../../hooks/useApi";
import type { ArticleContent } from "../../context/NotificationContext";
import { previewArticles } from "../../data/previewArticles";

export default function ArticleDetailPage() {
  const { id } = useParams();
  const result = useApi<ArticleContent>(
    `/articles/${id}`,
    previewArticles.find((article) => article._id === id),
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
                hideOnError
              />
            )}
            <article className="article-content">
              <span className="eyebrow">CẨM NANG ĐẮK SONG</span>
              <h1>{result.data.title}</h1>
              <p className="article-summary">{result.data.summary}</p>
              <div className="article-body">{result.data.content}</div>

              {Boolean(result.data.images && result.data.images.length > 1) && (
                <ImageGallery
                  images={result.data.images.slice(1)}
                  title={result.data.title}
                />
              )}

              {Boolean(result.data.sources?.length) && (
                <details className="policy">
                  <summary>Nguồn bài viết</summary>
                  {result.data.sources?.map((source) => (
                    <p key={source.url}>
                      {/^https:\/\//.test(source.url) ? (
                        <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                      ) : source.title}
                    </p>
                  ))}
                </details>
              )}
            </article>
          </>
        )
      )}
    </div>
  );
}
