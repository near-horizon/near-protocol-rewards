# NEAR Protocol Rewards SDK Architecture

```mermaid
graph TD
    subgraph "Core SDK"
        SDK[NEAR Protocol Rewards SDK]
        Config[SDK Configuration]
        SDK --> Config
    end

    subgraph "Data Collection"
        GH[GitHub Collector]
        NEAR[NEAR Collector]
        SDK --> GH
        SDK --> NEAR
    end

    subgraph "Processing Pipeline"
        VAL[Cross Validator]
        AGG[Data Aggregator]
        MA[Metrics Aggregator]
        
        GH --> VAL
        NEAR --> VAL
        VAL --> AGG
        AGG --> MA
    end

    subgraph "Storage Layer"
        PS[PostgreSQL Storage]
        MA --> PS
        
        subgraph "Storage Features"
            RT[Retry Logic]
            VAL[Data Validation]
            HC[Health Checks]
            PS --> RT
            PS --> VAL
            PS --> HC
        end
    end

    subgraph "Error Handling"
        EH[Error Handler]
        LOG[Logger]
        
        GH --> EH
        NEAR --> EH
        VAL --> EH
        AGG --> EH
        PS --> EH
        EH --> LOG
    end

    subgraph "Types"
        subgraph "Base Types"
            BM[BaseMetrics]
            MS[MetricsSource]
        end
        
        subgraph "Collection Types"
            GM[GitHubMetrics]
            NM[NEARMetrics]
            BM --> GM
            BM --> NM
        end
        
        subgraph "Processing Types"
            PM[ProcessedMetrics]
            VM[ValidatedMetrics]
            AM[AggregatedMetrics]
            SM[StoredMetrics]
        end
    end
```

## Key Components

### Core SDK

- SDK initialization and configuration
- Event handling
- Pipeline orchestration

### Data Collection

- GitHub metrics collection with rate limiting
- NEAR transaction metrics collection
- Data validation at source

### Processing Pipeline

- Cross-validation of metrics
- Data aggregation
- Metrics calculation
- Score computation

### Storage Layer

- Transaction management
- Retry logic for resilience
- Data validation before storage
- Health monitoring
- Data cleanup utilities

## Data Flow

1. SDK initializes collectors
2. Collectors gather metrics
3. Validation layer checks data
4. Aggregator processes metrics
5. Storage layer persists data
6. Error handling throughout pipeline
