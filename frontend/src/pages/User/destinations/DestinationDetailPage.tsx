import { API_PATHS } from "../../../utils/api";
import { useParams } from "react-router-dom";
import { useMemo } from "react";
import Header from "../../../components/layout/Header";
import Photo from "../../../components/common/Photo";
import ImageGallery from "../../../components/common/ImageGallery";
import Icon from "../../../components/common/Icon";
import { ErrorState, LoadingState } from "../../../components/common/States";
import TourCard from "../../../components/tour/TourCard";
import useApi from "../../../hooks/useApi";
import { previewExploreDestinations } from "../../../data/previewExplore";
import {
  previewDestinations,
  previewList,
  previewTours,
} from "../../../data/preview";
import { themeLabels } from "../../../utils/format";
import type { Destination, ListResponse, Tour } from "../../../types/api";

export default function DestinationDetailPage() {
  const { id } = useParams();
  const result = useApi<Destination>(
    API_PATHS.DESTINATIONS.GET_BY_ID(id!),
    previewDestinations.find((item) => item._id === id) ||
      previewExploreDestinations.find((item) => item._id === id),
  );
  const relatedPreview = useMemo(
    () => previewList(previewTours.filter((tour) => tour.destinationIds?.includes(id || "")).slice(0, 4)),
    [id],
  );
  const related = useApi<ListResponse<Tour>>(
    `/tours?destinationId=${id}&limit=4`,
    relatedPreview,
  );
  return (
    <div className="page">
      <Header title="Câu chuyện điểm đến" back fallback="/explore" />
      {result.loading ? (
        <LoadingState />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.retry} />
      ) : (
        result.data && (
          <>
            <Photo
              className="detail-cover"
              src={result.data.images[0]?.url}
              alt={result.data.name}
              eager
            />
            <div className="section">
              <span className="badge">{themeLabels[result.data.category]}</span>
              <h1 className="detail-title">{result.data.name}</h1>
              <p className="meta">
                <Icon name="pin" size={17} />
                {result.data.address || "Đắk Song"}
              </p>
              <p className="lead">{result.data.summary}</p>
              <p className="prose">{result.data.description}</p>
              {result.data.visitNotes && (
                <div className="notice">
                  <Icon name="info" />
                  <p>{result.data.visitNotes}</p>
                </div>
              )}
              {Boolean(result.data.images && result.data.images.length > 1) && (
                <ImageGallery
                  images={result.data.images.slice(1)}
                  title={result.data.name}
                />
              )}
              {result.data.sources?.length ? (
                <details className="policy">
                  <summary>Nguồn thông tin</summary>
                  {result.data.sources.map((source, index) => (
                    <p key={index}>
                      {/^https?:\/\//.test(source.url) ? (
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title || source.url}
                        </a>
                      ) : (
                        source.title
                      )}
                    </p>
                  ))}
                </details>
              ) : null}
            </div>
            <section className="section">
              <h2>Hành trình liên quan</h2>
              {related.loading ? (
                <LoadingState />
              ) : related.error ? (
                <ErrorState message={related.error} retry={related.retry} />
              ) : (
                <div className="tour-list">
                  {related.data?.data.map((tour) => (
                    <TourCard tour={tour} key={tour._id} compact />
                  ))}
                  {!related.data?.data.length && (
                    <p className="muted">Chưa có tour ghé điểm đến này.</p>
                  )}
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
