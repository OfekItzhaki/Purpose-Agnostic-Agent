import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, JobCounts } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KnowledgeDocument,
  IngestionStatus,
} from '../../rag/entities/knowledge-document.entity.js';
import {
  IngestionEvent,
  IngestionEventType,
} from '../entities/ingestion-event.entity.js';

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface ProcessingStatistics {
  total_processed: number;
  average_processing_time_ms: number;
  min_processing_time_ms: number;
  max_processing_time_ms: number;
  statistics_by_type: Record<
    string,
    {
      count: number;
      average_time_ms: number;
    }
  >;
}

export interface FailedIngestion {
  id: string;
  source_path: string;
  category: string;
  error_message?: string;
  retry_count: number;
  failed_at: Date;
}

@Injectable()
export class IngestionMonitorService {
  constructor(
    @InjectQueue('document-ingestion')
    private readonly ingestionQueue: Queue,
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(IngestionEvent)
    private readonly ingestionEventRepository: Repository<IngestionEvent>,
  ) {}

  /**
   * Get current queue status with job counts
   * Requirement 11.1: Display current status of Ingestion_Pipeline
   * Requirement 11.2: Display queue of pending documents when processing
   */
  async getQueueStatus(): Promise<QueueStatus> {
    const counts: JobCounts = await this.ingestionQueue.getJobCounts();

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: (counts as any).paused || 0,
    };
  }

  /**
   * Get processing time statistics for completed ingestions
   * Requirement 11.3: Display processing time statistics (average, minimum, maximum) per document type
   */
  async getProcessingStatistics(): Promise<ProcessingStatistics> {
    // Get all completed documents with timing information
    const completedDocs = await this.documentRepository.find({
      where: { status: IngestionStatus.COMPLETED },
    });

    if (completedDocs.length === 0) {
      return {
        total_processed: 0,
        average_processing_time_ms: 0,
        min_processing_time_ms: 0,
        max_processing_time_ms: 0,
        statistics_by_type: {},
      };
    }

    // Calculate processing times based on ingested_at and updated_at
    const processingTimes = completedDocs.map((doc) => {
      const startTime = new Date(doc.ingested_at).getTime();
      const endTime = new Date(doc.updated_at).getTime();
      return {
        time: endTime - startTime,
        type: this.getFileType(doc.source_path),
      };
    });

    // Calculate overall statistics
    const times = processingTimes.map((pt) => pt.time);
    const totalProcessed = times.length;
    const averageTime =
      times.reduce((sum, time) => sum + time, 0) / totalProcessed;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Calculate statistics by file type
    const statsByType: Record<string, { count: number; total_time: number }> =
      {};

    processingTimes.forEach(({ time, type }) => {
      if (!statsByType[type]) {
        statsByType[type] = { count: 0, total_time: 0 };
      }
      statsByType[type].count++;
      statsByType[type].total_time += time;
    });

    const statisticsByType: Record<
      string,
      { count: number; average_time_ms: number }
    > = {};
    Object.entries(statsByType).forEach(([type, stats]) => {
      statisticsByType[type] = {
        count: stats.count,
        average_time_ms: Math.round(stats.total_time / stats.count),
      };
    });

    return {
      total_processed: totalProcessed,
      average_processing_time_ms: Math.round(averageTime),
      min_processing_time_ms: Math.round(minTime),
      max_processing_time_ms: Math.round(maxTime),
      statistics_by_type: statisticsByType,
    };
  }

  /**
   * Get list of failed ingestions with error details
   * Requirement 11.4: Display error message and affected document when ingestion error occurs
   */
  async getFailedIngestions(): Promise<FailedIngestion[]> {
    const failedDocs = await this.documentRepository.find({
      where: { status: IngestionStatus.FAILED },
      order: { updated_at: 'DESC' },
    });

    return failedDocs.map((doc) => ({
      id: doc.id,
      source_path: doc.source_path,
      category: doc.category,
      error_message: doc.error_message,
      retry_count: doc.retry_count,
      failed_at: doc.updated_at,
    }));
  }

  /**
   * Extract file type from source path
   */
  private getFileType(sourcePath: string): string {
    const extension = sourcePath.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'txt':
        return 'Text';
      case 'md':
        return 'Markdown';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get ingestion events for a specific document
   * Requirement 7.5: Log Ingestion_Pipeline events with associated document identifiers
   */
  async getDocumentEvents(documentId: string): Promise<IngestionEvent[]> {
    return this.ingestionEventRepository.find({
      where: { documentId },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Get recent ingestion events across all documents
   * Requirement 7.5: Log Ingestion_Pipeline events (start, completion, failures)
   * Requirement 11.6: Display embedding provider being used for each ingestion operation
   */
  async getRecentEvents(limit: number = 50): Promise<IngestionEvent[]> {
    return this.ingestionEventRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['document'],
    });
  }

  /**
   * Get processing statistics from ingestion events
   * Requirement 11.3: Display processing time statistics
   * More accurate than using document timestamps since events track exact processing time
   */
  async getEventBasedStatistics(): Promise<ProcessingStatistics> {
    // Get all COMPLETE events with processing time
    const completeEvents = await this.ingestionEventRepository.find({
      where: {
        eventType: IngestionEventType.COMPLETE,
      },
      relations: ['document'],
    });

    if (completeEvents.length === 0) {
      return {
        total_processed: 0,
        average_processing_time_ms: 0,
        min_processing_time_ms: 0,
        max_processing_time_ms: 0,
        statistics_by_type: {},
      };
    }

    // Filter events with valid processing times
    const eventsWithTime = completeEvents.filter(
      (e) => e.processingTimeMs != null,
    );

    if (eventsWithTime.length === 0) {
      return {
        total_processed: completeEvents.length,
        average_processing_time_ms: 0,
        min_processing_time_ms: 0,
        max_processing_time_ms: 0,
        statistics_by_type: {},
      };
    }

    const times = eventsWithTime.map((e) => e.processingTimeMs!);
    const averageTime =
      times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Calculate statistics by file type
    const statsByType: Record<string, { count: number; total_time: number }> =
      {};

    eventsWithTime.forEach((event) => {
      if (!event.document) return;

      const type = this.getFileType(event.document.source_path);
      if (!statsByType[type]) {
        statsByType[type] = { count: 0, total_time: 0 };
      }
      statsByType[type].count++;
      statsByType[type].total_time += event.processingTimeMs!;
    });

    const statisticsByType: Record<
      string,
      { count: number; average_time_ms: number }
    > = {};
    Object.entries(statsByType).forEach(([type, stats]) => {
      statisticsByType[type] = {
        count: stats.count,
        average_time_ms: Math.round(stats.total_time / stats.count),
      };
    });

    return {
      total_processed: eventsWithTime.length,
      average_processing_time_ms: Math.round(averageTime),
      min_processing_time_ms: Math.round(minTime),
      max_processing_time_ms: Math.round(maxTime),
      statistics_by_type: statisticsByType,
    };
  }

  /**
   * Retry a failed ingestion by re-queuing the document
   * Requirements 3.6: Allow retry of failed ingestion operations
   * Requirements 11.5: Allow Admin_Users to retry failed ingestion operations
   */
  async retryIngestion(
    documentId: string,
  ): Promise<{ success: boolean; message: string; jobId?: string }> {
    // Find the document
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      return {
        success: false,
        message: `Document with ID ${documentId} not found`,
      };
    }

    // Check if document is in FAILED status
    if (document.status !== IngestionStatus.FAILED) {
      return {
        success: false,
        message: `Document is not in FAILED status (current status: ${document.status})`,
      };
    }

    // Check retry count to prevent infinite loops (max 3 retries)
    if (document.retry_count >= 3) {
      return {
        success: false,
        message: `Maximum retry attempts (3) reached for this document`,
      };
    }

    try {
      // Reset document status to PENDING before re-queuing
      document.status = IngestionStatus.PENDING;
      document.error_message = undefined;
      await this.documentRepository.save(document);

      // Re-queue the document for ingestion
      const job = await this.ingestionQueue.add({
        filePath: document.source_path,
        category: document.category,
        documentId: document.id,
      });

      return {
        success: true,
        message: `Document re-queued for ingestion`,
        jobId: job.id.toString(),
      };
    } catch (error) {
      // Revert status back to FAILED if re-queuing fails
      document.status = IngestionStatus.FAILED;
      await this.documentRepository.save(document);

      return {
        success: false,
        message: `Failed to re-queue document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
